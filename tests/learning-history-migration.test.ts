import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-000000000001";
const LEARNER = "00000000-0000-4000-8000-000000000002";
const OTHER = "00000000-0000-4000-8000-000000000003";
const OTHER_TEACHER = "00000000-0000-4000-8000-000000000004";

// Fictional fixtures only. This test never connects to a hosted database.
test("history imports are atomic and idempotent; a dual-role teacher sees both archives but learners only their own", async () => {
  const db = new PGlite();
  const payload = {
    schemaVersion: 1,
    learnerName: "Learner",
    course: "N5",
    sessions: [],
    answers: [],
  };
  const sql = "select public.import_learning_history($1,$2,$3,$4,$5) as id";
  async function asUser(id: string) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  }
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
    `);
    await db.exec(await readFile("supabase/migrations/202610280001_foundation.sql", "utf8"));
    await db.exec(await readFile("supabase/migrations/202610300001_learning_history.sql", "utf8"));
    await db.query("insert into auth.users(id) values ($1),($2),($3),($4)", [
      TEACHER,
      LEARNER,
      OTHER,
      OTHER_TEACHER,
    ]);
    await db.query(
      "update auth.users set email = case id when $1 then 'teacher@example.test' when $2 then 'learner@example.test' when $3 then 'other@example.test' else 'other-teacher@example.test' end, email_confirmed_at=now()",
      [TEACHER, LEARNER, OTHER],
    );
    await db.query("update public.profiles set role='teacher' where id in ($1,$2)", [
      TEACHER,
      OTHER_TEACHER,
    ]);
    await db.exec("set role service_role");
    const first = await db.query<{ id: string }>(sql, [
      "student-source",
      LEARNER,
      "learner@example.test",
      TEACHER,
      payload,
    ]);
    const retry = await db.query<{ id: string }>(sql, [
      "student-source",
      LEARNER,
      "learner@example.test",
      TEACHER,
      payload,
    ]);
    assert.equal(first.rows[0].id, retry.rows[0].id);
    await db.query(sql, [
      "teacher-source",
      TEACHER,
      "teacher@example.test",
      TEACHER,
      { ...payload, course: "N4" },
    ]);
    await assert.rejects(
      db.query(sql, ["student-source", OTHER, "other@example.test", TEACHER, payload]),
      /history_conflict/,
    );
    await assert.rejects(
      db.query(sql, [
        "student-source",
        LEARNER,
        "learner@example.test",
        TEACHER,
        { ...payload, course: "changed" },
      ]),
      /history_conflict/,
    );
    await assert.rejects(
      db.query(sql, ["invalid", LEARNER, "learner@example.test", OTHER, payload]),
      /invalid_history_accounts/,
    );
    await assert.rejects(
      db.query(sql, [
        "invalid",
        LEARNER,
        "learner@example.test",
        TEACHER,
        { ...payload, answers: {} },
      ]),
      /invalid_history/,
    );
    assert.equal(
      (await db.query("select id from public.learning_history_archives")).rows.length,
      2,
    );
    await asUser(TEACHER);
    assert.equal(
      (await db.query("select id from public.learning_history_archives")).rows.length,
      2,
    );
    await asUser(LEARNER);
    assert.equal(
      (await db.query("select id from public.learning_history_archives")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query("select id from public.learning_history_archives where learner_id=$1", [
          TEACHER,
        ])
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(sql, ["forged", LEARNER, "learner@example.test", LEARNER, payload]),
    );
    await assert.rejects(db.exec("update public.learning_history_archives set payload='{}'"));
    await assert.rejects(db.exec("delete from public.learning_history_archives"));
    await asUser(OTHER);
    assert.equal((await db.query("select * from public.learning_history_archives")).rows.length, 0);
    await asUser(OTHER_TEACHER);
    assert.equal((await db.query("select * from public.learning_history_archives")).rows.length, 0);
    await db.exec("reset role; set role service_role");
    const pendingId = "00000000-0000-4000-8000-000000000005";
    const pending = await db.query<{ id: string }>(sql, [
      "pending-source",
      null,
      "pending@example.test",
      TEACHER,
      payload,
    ]);
    const archiveId = pending.rows[0].id;
    const linkSql = "select public.link_learning_history($1,$2) as status";
    assert.equal(
      (await db.query<{ status: string }>(linkSql, [TEACHER, archiveId])).rows[0].status,
      "account_not_ready",
    );
    await db.exec("reset role");
    await db.query("insert into auth.users(id,email) values($1,'pending@example.test')", [
      pendingId,
    ]);
    await asUser(pendingId);
    assert.equal(
      (await db.query("select * from public.learning_history_archives")).rows.length,
      0,
      "registration must not claim history automatically",
    );
    await assert.rejects(db.query(linkSql, [TEACHER, archiveId]));
    await db.exec("reset role; set role service_role");
    await assert.rejects(db.query(linkSql, [OTHER_TEACHER, archiveId]), /not_found/);
    assert.equal(
      (await db.query<{ status: string }>(linkSql, [TEACHER, archiveId])).rows[0].status,
      "account_not_ready",
    );
    await db.exec("reset role");
    await db.query("update auth.users set email_confirmed_at=now() where id=$1", [pendingId]);
    assert.equal(
      (await db.query<{ status: string }>(linkSql, [TEACHER, archiveId])).rows[0].status,
      "linked",
    );
    assert.equal(
      (await db.query<{ status: string }>(linkSql, [TEACHER, archiveId])).rows[0].status,
      "already_linked",
    );
    assert.equal(
      (
        await db.query<{ id: string }>(sql, [
          "pending-source",
          null,
          "pending@example.test",
          TEACHER,
          payload,
        ])
      ).rows[0].id,
      archiveId,
    );
    await asUser(pendingId);
    assert.equal((await db.query("select * from public.learning_history_archives")).rows.length, 1);
    await db.exec("reset role");
    await db.query("update public.profiles set role='student' where id=$1", [TEACHER]);
    await asUser(TEACHER);
    assert.equal(
      (await db.query("select * from public.learning_history_archives")).rows.length,
      1,
      "a suspended teacher retains self study only",
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(db.exec("select * from public.learning_history_archives"));
  } finally {
    await db.close();
  }
});
