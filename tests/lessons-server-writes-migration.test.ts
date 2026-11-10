import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const MIGRATION = "20261110085351_lessons_server_writes_only.sql";
const OWNER = "00000000-0000-4000-8000-0000000000b1";
const COPIER = "00000000-0000-4000-8000-0000000000b2";

const content = {
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  slides: [{ id: "s1", type: "title", jp: "第1課", vi: "Bài 1" }],
  questions: [
    {
      id: "q1",
      type: "choice",
      prompt: "Chọn đáp án.",
      options: ["A", "B"],
      answer: [0],
      multiple: false,
      points: 1,
      tags: [],
      explain: "A đúng.",
    },
  ],
};

test("teachers read their lessons directly but change them only through the server", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
    `);
    const files = (await readdir("supabase/migrations"))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    const migrate = async (select: (file: string) => boolean) => {
      for (const file of files.filter(select)) {
        await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
      }
    };
    const asTeacher = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec("set role authenticated");
    };
    const directWrites = async () => {
      await asTeacher(COPIER);
      const results = [];
      for (const sql of [
        "insert into public.lessons(id, owner_id, order_no, title) values ('direct', $1, 9, 'Direct')",
        "update public.lessons set visibility = 'public' where id = 'copied'",
        "update public.lessons set draft_content = '{}' where id = 'copied'",
        "update public.lessons set archived_at = now() where id = 'copied'",
      ]) {
        results.push(
          await db.query(sql, sql.includes("$1") ? [COPIER] : []).then(
            (result) => `ok:${result.affectedRows}`,
            (error: Error) => (/permission denied/.test(error.message) ? "denied" : error.message),
          ),
        );
      }
      await db.exec("reset role");
      return results;
    };

    await migrate((file) => file < MIGRATION);
    await db.query(
      "insert into auth.users(id, email_confirmed_at) values ($1, now()), ($2, now())",
      [OWNER, COPIER],
    );
    await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
      OWNER,
      COPIER,
    ]);
    await db.exec("set role service_role");
    const original = await db.query<{ id: string }>(
      "select public.publish_lesson('original', $1, 0, 'Bài gốc', '', '', 1, 'n5', $2) as id",
      [OWNER, content],
    );
    await db.query(
      "select public.publish_lesson('copied', $1, 0, 'Bản sao', '', '', 1, 'n5', $2)",
      [COPIER, content],
    );
    await db.query("update public.lessons set copied_from_version_id = $1 where id = 'copied'", [
      original.rows[0].id,
    ]);
    await db.exec("reset role");

    // Before: the Data API let the copier publish another teacher's lesson to everyone.
    assert.deepEqual(await directWrites(), ["ok:1", "ok:1", "ok:1", "ok:1"]);
    await db.exec(
      "delete from public.lessons where id = 'direct'; update public.lessons set visibility = 'class', archived_at = null where id = 'copied'",
    );

    await migrate((file) => file >= MIGRATION);
    assert.deepEqual(await directWrites(), ["denied", "denied", "denied", "denied"]);
    const privileges = await db.query<Record<string, boolean>>(`select
      has_any_column_privilege('authenticated', 'public.lessons', 'INSERT') as insert,
      has_any_column_privilege('authenticated', 'public.lessons', 'UPDATE') as update,
      has_table_privilege('authenticated', 'public.lessons', 'DELETE') as delete,
      has_table_privilege('authenticated', 'public.lessons', 'SELECT') as select`);
    assert.deepEqual(privileges.rows[0], {
      insert: false,
      update: false,
      delete: false,
      select: true,
    });

    // Reading stays: a teacher sees their own lessons and no one else's.
    await asTeacher(COPIER);
    const visible = await db.query<{ id: string }>("select id from public.lessons order by id");
    assert.deepEqual(
      visible.rows.map((row) => row.id),
      ["copied"],
    );
    await db.exec("reset role");

    // The server keeps every write path, including the guard the direct grant skipped.
    await db.exec("set role service_role");
    await db.query("select public.set_lesson_visibility($1, 'original', 'public')", [OWNER]);
    await assert.rejects(
      db.query("select public.set_lesson_visibility($1, 'copied', 'public')", [COPIER]),
      /reshare_not_allowed/,
    );
    const revision = await db.query<{ draft_revision: number }>(
      "select draft_revision from public.lessons where id = 'original'",
    );
    const next = await db.query<{ id: string }>(
      "select public.publish_lesson('original', $1, $2, 'Bài gốc', '', '', 1, 'n5', $3) as id",
      [
        OWNER,
        revision.rows[0].draft_revision,
        { ...content, slides: [{ ...content.slides[0], vi: "Bài 1 (sửa)" }] },
      ],
    );
    const version = await db.query<{ version_no: number }>(
      "select version_no from public.lesson_versions where id = $1",
      [next.rows[0].id],
    );
    assert.equal(version.rows[0].version_no, 2);
  } finally {
    await db.close();
  }
});
