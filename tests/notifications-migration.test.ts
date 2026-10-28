import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const STUDENT = "00000000-0000-4000-8000-000000000003";
const OTHER = "00000000-0000-4000-8000-000000000004";

test("email jobs are claimed once, leased, retried within limits and private to the server", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
    `);
    for (const file of [
      "202610280001_foundation.sql",
      "202610280002_lesson_publication.sql",
      "202610280003_sample_lessons.sql",
      "202610280004_classroom.sql",
      "202610280005_notifications.sql",
    ]) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.query(
      "insert into auth.users(id, email, raw_user_meta_data) values ($1, 'ha@example.test', $3), ($2, 'binh@example.test', $3)",
      [STUDENT, OTHER, { full_name: "Lê Thu Hà" }],
    );
    await db.exec("set role service_role;");
    await db.query(
      "insert into public.notification_preferences(user_id, reminder_frequency) values ($1, 'daily')",
      [STUDENT],
    );
    const insertJob =
      "insert into public.email_log(user_id, email_type, for_date, idempotency_key) values ($1, 'daily_reminder', '2026-10-29', $2) on conflict do nothing returning user_id";
    assert.equal(
      (await db.query(insertJob, [STUDENT, `daily_reminder:${STUDENT}`])).rows.length,
      1,
    );
    assert.equal(
      (await db.query(insertJob, [STUDENT, `daily_reminder:${STUDENT}`])).rows.length,
      0,
      "the same person/type/day is planned once",
    );
    const claim = "select * from public.claim_email_jobs(10, 300, 3)";
    const first = await db.query<{ attempts: number; status: string }>(claim);
    assert.deepEqual(
      first.rows.map((row) => [row.status, row.attempts]),
      [["sending", 1]],
    );
    assert.equal((await db.query(claim)).rows.length, 0, "a leased job is not claimed again");
    await db.exec("update public.email_log set lease_until = now() - interval '1 second'");
    const reclaimed = await db.query<{ attempts: number }>(claim);
    assert.equal(reclaimed.rows[0].attempts, 2, "an expired lease hands the job to the next run");
    await db.exec(
      "update public.email_log set status = 'failed', lease_until = null, next_attempt_at = now() + interval '15 minutes'",
    );
    assert.equal((await db.query(claim)).rows.length, 0, "failed jobs wait for their backoff");
    await db.exec(
      "update public.email_log set next_attempt_at = now() - interval '1 second', attempts = 3",
    );
    assert.equal((await db.query(claim)).rows.length, 0, "exhausted jobs are not retried");
    await db.exec(
      "update public.email_log set status = 'sending', attempts = 3, lease_until = now() - interval '1 second'",
    );
    await db.query(claim);
    const stuck = await db.query<{ status: string; last_error: string }>(
      "select status, last_error from public.email_log",
    );
    assert.deepEqual(stuck.rows[0], { status: "failed", last_error: "lease_expired" });
    await assert.rejects(
      db.exec("update public.email_log set status = 'sent'"),
      "sent jobs need a sent_at timestamp",
    );
    const recipients = await db.query<{ email: string; role: string }>(
      "select email, role from public.email_recipients($1)",
      [[STUDENT]],
    );
    assert.deepEqual(recipients.rows, [{ email: "ha@example.test", role: "student" }]);

    await db.exec("reset role;");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [STUDENT]);
    await db.exec("set role authenticated;");
    assert.equal((await db.query("select * from public.notification_preferences")).rows.length, 1);
    await assert.rejects(db.exec("select * from public.email_log"));
    await assert.rejects(
      db.exec("update public.notification_preferences set weekly_enabled = true"),
    );
    await assert.rejects(db.query("select * from public.email_recipients($1)", [[STUDENT]]));
    await db.exec("reset role;");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [OTHER]);
    await db.exec("set role authenticated;");
    assert.equal((await db.query("select * from public.notification_preferences")).rows.length, 0);
  } finally {
    await db.close();
  }
});
