import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const ADMIN = "00000000-0000-4000-8000-000000000041";
const APPLICANT = "00000000-0000-4000-8000-000000000042";
const LATER = "00000000-0000-4000-8000-000000000043";
const LEGACY_TEACHER = "00000000-0000-4000-8000-000000000044";

const MIGRATIONS = [
  "202610280001_foundation.sql",
  "202610280002_lesson_publication.sql",
  "202610280003_sample_lessons.sql",
  "202610280004_classroom.sql",
  "202610280005_notifications.sql",
  "202610280006_listening.sql",
  "202610290001_teaching_service.sql",
  "202610290002_teacher_activation.sql",
  "202610290003_teaching_authoring.sql",
  "202610290004_lesson_sharing.sql",
  "202610290005_platform_admin.sql",
];

test("teacher requests wait for an admin while approval is required and admins act with audit", async () => {
  const db = new PGlite();
  async function one<Row>(sql: string, params: unknown[] = []) {
    const result = await db.query<Row>(sql, params);
    assert.equal(result.rows.length, 1);
    return result.rows[0];
  }
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
    for (const file of MIGRATIONS.slice(0, 6)) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.query(
      "insert into auth.users(id, email_confirmed_at) values ($1, now()), ($2, now()), ($3, now()), ($4, now())",
      [ADMIN, APPLICANT, LATER, LEGACY_TEACHER],
    );
    await db.query("update public.profiles set role = 'teacher' where id = $1", [LEGACY_TEACHER]);
    for (const file of MIGRATIONS.slice(6)) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.query("insert into public.platform_admins(user_id) values ($1)", [ADMIN]);
    await db.exec("set role service_role");

    const role = async (user: string) =>
      (await one<{ role: string }>("select role from public.profiles where id = $1", [user])).role;
    const activate = async (user: string) =>
      (
        await one<{ status: string }>(
          "select public.activate_teacher($1, '2026-10-29') as status",
          [user],
        )
      ).status;
    const setStatus = (admin: string, user: string, status: string) =>
      db.query("select public.admin_set_teacher_status($1, $2, $3)", [admin, user, status]);

    assert.equal(await role(LEGACY_TEACHER), "teacher", "existing teachers keep teaching");
    assert.equal(await activate(APPLICANT), "pending");
    assert.equal(await activate(APPLICANT), "pending", "a repeated request stays pending");
    assert.equal(await role(APPLICANT), "student", "a pending request grants nothing");
    await assert.rejects(
      setStatus(APPLICANT, APPLICANT, "active"),
      /not_found/,
      "non-admins cannot approve",
    );
    await assert.rejects(setStatus(ADMIN, APPLICANT, "owner"), /invalid_input/);
    await setStatus(ADMIN, APPLICANT, "active");
    assert.equal(await role(APPLICANT), "teacher");

    await db.query(
      "select public.admin_update_teacher_plan($1, $2, '2026-12-31', 'Đã thanh toán 2 tháng')",
      [ADMIN, APPLICANT],
    );
    const plan = await one<{ access_until: string; admin_note: string }>(
      "select access_until::text, admin_note from public.teacher_accounts where user_id = $1",
      [APPLICANT],
    );
    assert.deepEqual(plan, { access_until: "2026-12-31", admin_note: "Đã thanh toán 2 tháng" });

    await setStatus(ADMIN, APPLICANT, "suspended");
    assert.equal(await role(APPLICANT), "student");
    await assert.rejects(
      activate(APPLICANT),
      /teacher_suspended/,
      "suspended teachers cannot self-reactivate",
    );
    await setStatus(ADMIN, APPLICANT, "active");
    assert.equal(await role(APPLICANT), "teacher");

    assert.equal(await activate(LATER), "pending");
    await assert.rejects(
      db.query("select public.admin_set_teacher_approval($1, false)", [APPLICANT]),
      /not_found/,
    );
    await db.query("select public.admin_set_teacher_approval($1, false)", [ADMIN]);
    assert.equal(
      await activate(LATER),
      "active",
      "turning approval off activates a pending request",
    );
    assert.equal(await role(LATER), "teacher");

    const actions = await db.query<{ action: string }>(
      "select action from public.audit_events where actor_id = $1 order by created_at, action",
      [ADMIN],
    );
    assert.deepEqual([...new Set(actions.rows.map((row) => row.action))].sort(), [
      "admin.approval.off",
      "admin.teacher.active",
      "admin.teacher.plan",
      "admin.teacher.suspended",
    ]);

    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [APPLICANT]);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select * from public.platform_admins"));
    await assert.rejects(
      db.query("insert into public.platform_admins(user_id) values ($1)", [APPLICANT]),
    );
    await assert.rejects(
      db.query("select public.admin_set_teacher_status($1, $1, 'active')", [ADMIN]),
    );
  } finally {
    await db.close();
  }
});
