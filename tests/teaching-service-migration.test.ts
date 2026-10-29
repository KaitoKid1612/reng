import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const OWNER = "00000000-0000-4000-8000-000000000001";
const LEARNER = "00000000-0000-4000-8000-000000000002";
const OTHER = "00000000-0000-4000-8000-000000000003";
const UNVERIFIED = "00000000-0000-4000-8000-000000000004";

const MIGRATIONS = [
  "202610280001_foundation.sql",
  "202610280002_lesson_publication.sql",
  "202610280003_sample_lessons.sql",
  "202610280004_classroom.sql",
  "202610280005_notifications.sql",
  "202610280006_listening.sql",
];

test("service upgrade preserves private versions, teacher learning, capacity and verified activation", async () => {
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
    for (const file of MIGRATIONS) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.query(
      "insert into auth.users(id,email_confirmed_at) values ($1,now()),($2,now()),($3,now()),($4,null)",
      [OWNER, LEARNER, OTHER, UNVERIFIED],
    );
    await db.query("update public.profiles set role='teacher' where id=$1", [OWNER]);
    await db.exec(await readFile("supabase/migrations/202610290001_teaching_service.sql", "utf8"));
    await db.exec(
      await readFile("supabase/migrations/202610290002_teacher_activation.sql", "utf8"),
    );
    assert.equal(
      (
        await one<{ status: string }>(
          "select status from public.teacher_accounts where user_id=$1",
          [OWNER],
        )
      ).status,
      "active",
    );
    await db.exec("set role service_role");
    await assert.rejects(
      db.query("select public.activate_teacher($1,'2026-10-29')", [UNVERIFIED]),
      /email_unverified/,
    );
    await assert.rejects(
      db.query("select public.activate_teacher($1,'invalid')", [LEARNER]),
      /invalid_terms/,
    );
    await db.query("select public.activate_teacher($1,'2026-10-29')", [LEARNER]);
    await db.query("select public.activate_teacher($1,'2026-10-29')", [LEARNER]);
    assert.equal(
      (await one<{ role: string }>("select role from public.profiles where id=$1", [LEARNER])).role,
      "teacher",
    );
    assert.equal(
      (
        await one<{ count: number }>(
          "select count(*)::int as count from public.audit_events where action='teacher.activated'",
        )
      ).count,
      1,
    );
    const classRow = await one<{ id: string }>(
      "insert into public.classes(teacher_id,name,join_code,capacity,meeting_url) values ($1,'Class','ABCDEFGH',1,'https://meet.google.com/abc-defg-hij') returning id",
      [OWNER],
    );
    const join = (id: string) =>
      one<{ status: string }>("select * from public.join_class($1,'ABCDEFGH')", [id]);
    assert.equal((await join(LEARNER)).status, "joined", "a teacher can learn in another class");
    assert.equal((await join(LEARNER)).status, "already_member");
    assert.equal((await join(OTHER)).status, "class_full");
    await assert.rejects(
      db.query("update public.classes set meeting_url='https://evil.example/' where id=$1", [
        classRow.id,
      ]),
    );
    await db.query(
      "select public.update_class_settings($1,$2,0,'Updated',70,true,2,null,'chinese','zh-Hans')",
      [OWNER, classRow.id],
    );
    await assert.rejects(
      db.query(
        "select public.update_class_settings($1,$2,0,'Stale',70,true,2,null,'chinese','zh-Hans')",
        [OWNER, classRow.id],
      ),
      /revision_conflict/,
    );
    assert.equal((await join(OTHER)).status, "joined");
    await assert.rejects(
      db.query(
        "select public.update_class_settings($1,$2,1,'Too small',70,true,1,null,'chinese','zh-Hans')",
        [OWNER, classRow.id],
      ),
      /capacity_below_members/,
    );
    const content = {
      schemaVersion: 1,
      vocab: [],
      grammar: [],
      questions: [],
      slides: [{ id: "s1", type: "title", jp: "日本語", vi: "Bài" }],
    };
    const publish = (revision: number) =>
      one<{ id: string }>(
        "select public.publish_lesson('private-lesson',$1,$2,'Bài','日本語','Summary',1,'n5',$3) as id",
        [OWNER, revision, content],
      );
    const first = await publish(0);
    assert.equal(
      (
        await one<{ visibility: string }>(
          "select visibility from public.lessons where id='private-lesson'",
        )
      ).visibility,
      "class",
    );
    const read = (user: string | null, version: string | null) =>
      one<{ content: unknown }>(
        "select public.read_lesson_version($1,'private-lesson',$2) as content",
        [user, version],
      );
    assert.equal((await read(null, first.id)).content, null);
    assert.equal(
      (await read(LEARNER, first.id)).content,
      null,
      "membership alone does not open unassigned lessons",
    );
    assert.ok((await read(OWNER, first.id)).content);
    await db.query(
      "select public.upsert_class_lesson($1,$2,'private-lesson',$3,1,now()-interval '1 minute')",
      [OWNER, classRow.id, first.id],
    );
    assert.ok((await read(LEARNER, first.id)).content);
    const second = await publish(1);
    assert.equal(
      (await read(LEARNER, second.id)).content,
      null,
      "members only read the pinned version",
    );
    assert.ok((await read(OWNER, second.id)).content);
    await db.query(
      "update public.class_lessons set available_at=now()+interval '1 day' where class_id=$1",
      [classRow.id],
    );
    assert.equal((await read(LEARNER, first.id)).content, null);
    await db.query(
      "update public.class_lessons set available_at=now()-interval '1 minute' where class_id=$1",
      [classRow.id],
    );
    await db.query("update public.enrollments set left_at=now() where user_id=$1", [LEARNER]);
    assert.equal((await read(LEARNER, first.id)).content, null);
    await assert.rejects(
      db.query("select public.set_lesson_visibility($1,'private-lesson','public')", [OTHER]),
      /lesson_not_found/,
    );
    await db.query("select public.set_lesson_visibility($1,'private-lesson','public')", [OWNER]);
    assert.ok((await read(null, second.id)).content);
    await publish(2);
    assert.equal(
      (
        await one<{ visibility: string }>(
          "select visibility from public.lessons where id='private-lesson'",
        )
      ).visibility,
      "public",
      "republishing preserves the owner's explicit choice",
    );
    await db.query("update public.teacher_accounts set status='suspended' where user_id=$1", [
      LEARNER,
    ]);
    assert.equal(
      (await one<{ role: string }>("select role from public.profiles where id=$1", [LEARNER])).role,
      "student",
    );
    await assert.rejects(
      db.query("select public.activate_teacher($1,'2026-10-29')", [LEARNER]),
      /teacher_suspended/,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [LEARNER]);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select public.activate_teacher($1,'2026-10-29')", [LEARNER]));
    await assert.rejects(
      db.query("select public.read_lesson_version($1,'private-lesson',null)", [OWNER]),
    );
    await assert.rejects(
      db.query("update public.teacher_accounts set status='active' where user_id=$1", [LEARNER]),
    );
    await assert.rejects(
      db.query("update public.profiles set role='teacher' where id=$1", [LEARNER]),
    );
  } finally {
    await db.close();
  }
});
