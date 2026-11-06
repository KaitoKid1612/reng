import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-0000000000a1";
const OTHER_TEACHER = "00000000-0000-4000-8000-0000000000a2";
const AN = "00000000-0000-4000-8000-0000000000a3";
const BINH = "00000000-0000-4000-8000-0000000000a4";
const OUTSIDER = "00000000-0000-4000-8000-0000000000a5";

async function openDatabase() {
  const db = new PGlite();
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
  const files = (await readdir("supabase/migrations")).filter((file) => file.endsWith(".sql"));
  for (const file of files.sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }
  for (const id of [TEACHER, OTHER_TEACHER, AN, BINH, OUTSIDER]) {
    await db.query("insert into auth.users(id, email_confirmed_at) values ($1, now())", [id]);
  }
  await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
    TEACHER,
    OTHER_TEACHER,
  ]);
  const classId = (
    await db.query<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'Minna tối', 'ABCDEFGH') returning id",
      [TEACHER],
    )
  ).rows[0].id;
  const otherClassId = (
    await db.query<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'Lớp khác', 'BCDEFGHJ') returning id",
      [OTHER_TEACHER],
    )
  ).rows[0].id;
  await db.query("insert into public.enrollments(class_id, user_id) values ($1, $2), ($1, $3)", [
    classId,
    AN,
    BINH,
  ]);
  await db.exec("set role service_role;");
  const session = async (id: string, day: string) =>
    (
      await db.query<{ id: string }>(
        "insert into public.class_sessions(class_id, taught_on) values ($1, $2) returning id",
        [id, day],
      )
    ).rows[0].id;
  return {
    db,
    classId,
    sessionId: await session(classId, "2026-11-04"),
    otherSessionId: await session(otherClassId, "2026-11-04"),
  };
}

async function marks(db: PGlite, sessionId: string) {
  const rows = await db.query<{ user_id: string; is_present: boolean }>(
    "select user_id, is_present from public.class_session_attendance where session_id = $1 order by user_id",
    [sessionId],
  );
  return rows.rows.map((row) => [row.user_id, row.is_present]);
}

test("the class teacher marks learners present or absent and can correct the marks", async () => {
  const { db, classId, sessionId } = await openDatabase();
  const save = (present: string[], absent: string[], teacher = TEACHER, session = sessionId) =>
    db.query<{ count: number }>(
      "select public.save_session_attendance($1, $2, $3, $4::uuid[], $5::uuid[]) as count",
      [teacher, classId, session, present, absent],
    );
  try {
    assert.equal((await save([AN, AN], [BINH])).rows[0].count, 2, "a repeated ID counts once");
    assert.deepEqual(await marks(db, sessionId), [
      [AN, true],
      [BINH, false],
    ]);
    // Correcting one learner leaves the other learner's mark as it was.
    await save([BINH], []);
    assert.deepEqual(await marks(db, sessionId), [
      [AN, true],
      [BINH, true],
    ]);
    // Everyone absent is still a session with attendance taken.
    await save([], [AN, BINH]);
    assert.deepEqual(await marks(db, sessionId), [
      [AN, false],
      [BINH, false],
    ]);

    await assert.rejects(save([OUTSIDER], []), /reng:invalid_request/, "only class members");
    await assert.rejects(save([AN], [AN]), /reng:invalid_request/, "present and absent at once");
    await assert.rejects(save([AN], [], OTHER_TEACHER), /reng:class_not_found/);
    await db.query("update public.profiles set role = 'student' where id = $1", [TEACHER]);
    await assert.rejects(save([AN], []), /reng:class_not_found/, "a paused teacher cannot mark");
    await db.query("update public.profiles set role = 'teacher' where id = $1", [TEACHER]);
  } finally {
    await db.close();
  }
});

test("attendance stays inside its class, is private and goes away with its session", async () => {
  const { db, classId, sessionId, otherSessionId } = await openDatabase();
  try {
    await assert.rejects(
      db.query("select public.save_session_attendance($1, $2, $3, $4::uuid[], '{}')", [
        TEACHER,
        classId,
        otherSessionId,
        [AN],
      ]),
      /reng:not_found/,
      "a session of another class is not found through this class",
    );
    await db.query("select public.save_session_attendance($1, $2, $3, $4::uuid[], '{}')", [
      TEACHER,
      classId,
      sessionId,
      [AN],
    ]);
    // A learner who leaves keeps the record of the sessions they attended.
    await db.exec("reset role;");
    await db.query("update public.enrollments set left_at = now() where user_id = $1", [AN]);
    assert.deepEqual(await marks(db, sessionId), [[AN, true]]);

    for (const role of ["anon", "authenticated"]) {
      await db.exec(`reset role; set role ${role};`);
      await assert.rejects(db.query("select * from public.class_session_attendance"));
      await assert.rejects(
        db.query("select public.save_session_attendance($1, $2, $3, '{}', '{}')", [
          TEACHER,
          classId,
          sessionId,
        ]),
      );
    }
    await db.exec("reset role; set role service_role;");
    await db.query("delete from public.class_sessions where id = $1", [sessionId]);
    assert.deepEqual(await marks(db, sessionId), [], "deleting a session deletes its marks");
  } finally {
    await db.close();
  }
});
