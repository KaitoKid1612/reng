import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const MIGRATION = "20261125082709_delete_unlinked_history_on_account_deletion.sql";
const TEACHER = "00000000-0000-4000-8000-0000000000d1";
const LEARNER = "00000000-0000-4000-8000-0000000000d2";

test("deleting a learner also deletes history imported for their email but never linked", async () => {
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
      .filter((file) => file.endsWith(".sql") && file <= MIGRATION)
      .sort();
    for (const file of files) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    for (const [id, email, name] of [
      [TEACHER, "co.lan@example.test", "Cô Lan"],
      [LEARNER, "Binh@Example.test", "Nguyễn Văn Bình"],
    ]) {
      await db.query(
        "insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data) values ($1, $2, now(), $3)",
        [id, email, { full_name: name }],
      );
    }
    await db.query("update public.profiles set role = 'teacher' where id = $1", [TEACHER]);
    const archive = (key: string, learnerId: string | null, email: string) =>
      db.query(
        `insert into public.learning_history_archives(source_key, learner_id, learner_email, teacher_id,
          learner_name, course, session_count, answer_count, payload)
         values ($1, $2, $3, $4, 'Bình', 'N5', 1, 1, '{}')`,
        [key, learnerId, email, TEACHER],
      );
    await archive("sheet:linked", LEARNER, "binh@example.test");
    await archive("sheet:unlinked", null, "binh@example.test");
    await archive("sheet:someone-else", null, "ha@example.test");

    await db.exec("set role service_role");
    await db.query("select public.anonymize_learner($1)", [LEARNER]);
    await db.exec("reset role");

    const left = await db.query<{ source_key: string }>(
      "select source_key from public.learning_history_archives order by source_key",
    );
    assert.deepEqual(
      left.rows.map((row) => row.source_key),
      ["sheet:someone-else"],
    );
    const profile = await db.query<{ full_name: string; deleted: boolean }>(
      "select full_name, deleted_at is not null as deleted from public.profiles where id = $1",
      [LEARNER],
    );
    assert.deepEqual(profile.rows, [{ full_name: "Học viên đã xóa", deleted: true }]);
  } finally {
    await db.close();
  }
});
