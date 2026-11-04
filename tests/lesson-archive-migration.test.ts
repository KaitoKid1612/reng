import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-000000000091";
const OTHER_TEACHER = "00000000-0000-4000-8000-000000000092";

const choice = (id: string) => ({
  id,
  type: "choice",
  prompt: `いすが 8（　　）あります。${id}`,
  options: ["つ", "にん"],
  multiple: false,
  answer: [0],
  explain: "Đồ vật đếm bằng 〜つ.",
  points: 1,
  tags: [],
});

const lessonContent = {
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  slides: [{ id: "intro", type: "title", jp: "第11課", vi: "Bài 11" }],
  questions: [choice("q1"), choice("q2")],
};

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
  await db.query("insert into auth.users(id, email_confirmed_at) values ($1, now()), ($2, now())", [
    TEACHER,
    OTHER_TEACHER,
  ]);
  await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
    TEACHER,
    OTHER_TEACHER,
  ]);
  await db.exec("set role service_role");
  return db;
}

async function one<Row>(db: PGlite, sql: string, params: unknown[] = []) {
  const result = await db.query<Row>(sql, params);
  assert.equal(result.rows.length, 1, sql);
  return result.rows[0];
}

test("a lesson leaves a class only without assignments, and its log and daily pin let go", async () => {
  const db = await openDatabase();
  const v11 = await one<{ id: string }>(
    db,
    "select public.publish_lesson('minna-11', $1, 0, 'Bài 11', '第11課', 'Đếm', 11, 'minna-1', $2) as id",
    [TEACHER, lessonContent],
  );
  const v12 = await one<{ id: string }>(
    db,
    "select public.publish_lesson('minna-12', $1, 0, 'Bài 12', '第12課', 'So sánh', 12, 'minna-1', $2) as id",
    [TEACHER, lessonContent],
  );
  const classRow = await one<{ id: string }>(
    db,
    "insert into public.classes(teacher_id, name, join_code) values ($1, 'Minna tối', 'ABCDEFGH') returning id",
    [TEACHER],
  );
  for (const [lessonId, versionId, order] of [
    ["minna-11", v11.id, 1],
    ["minna-12", v12.id, 2],
  ]) {
    await db.query(
      "select public.upsert_class_lesson($1, $2, $3, $4, $5, now() - interval '1 minute')",
      [TEACHER, classRow.id, lessonId, versionId, order],
    );
  }
  await db.query(
    "select public.publish_assignment($1, $2, 'minna-11', 'Luyện bài 11', 'practice', null, false, 70, 1, 'after_submit', array['q1'], null)",
    [TEACHER, classRow.id],
  );
  await db.query("select public.set_daily_practice($1, $2, 5, 'minna-12')", [TEACHER, classRow.id]);
  await db.query(
    "insert into public.class_sessions(class_id, taught_on, lesson_id, lesson_version_id, slide_reached, notes) values ($1, current_date, 'minna-12', $2, 3, 'Dạy tới bảng so sánh')",
    [classRow.id, v12.id],
  );
  const remove = (teacherId: string, lessonId: string) =>
    one<{ status: string }>(db, "select public.remove_class_lesson($1, $2, $3) as status", [
      teacherId,
      classRow.id,
      lessonId,
    ]);

  assert.equal((await remove(TEACHER, "minna-11")).status, "has_assignments");
  await assert.rejects(remove(OTHER_TEACHER, "minna-12"), /reng:class_not_found/);
  assert.equal((await remove(TEACHER, "minna-12")).status, "removed");
  assert.equal((await remove(TEACHER, "minna-12")).status, "not_in_class");
  const lessons = await db.query<{ lesson_id: string }>(
    "select lesson_id from public.class_lessons where class_id = $1 order by lesson_id",
    [classRow.id],
  );
  assert.deepEqual(
    lessons.rows.map((row) => row.lesson_id),
    ["minna-11"],
  );
  const session = await one<{
    lesson_id: string | null;
    slide_reached: number | null;
    notes: string;
  }>(db, "select lesson_id, slide_reached, notes from public.class_sessions where class_id = $1", [
    classRow.id,
  ]);
  assert.deepEqual(session, {
    lesson_id: null,
    slide_reached: null,
    notes: "Dạy tới bảng so sánh",
  });
  const pin = await one<{ daily_practice_lesson_id: string | null }>(
    db,
    "select daily_practice_lesson_id from public.classes where id = $1",
    [classRow.id],
  );
  assert.equal(pin.daily_practice_lesson_id, null);

  // A lesson still in an active class cannot be archived; one that left every class can.
  const archive = (teacherId: string, lessonId: string, archived: boolean) =>
    one<{ status: string }>(db, "select public.set_lesson_archived($1, $2, $3) as status", [
      teacherId,
      lessonId,
      archived,
    ]);
  assert.equal((await archive(TEACHER, "minna-11", true)).status, "in_class");
  await assert.rejects(archive(OTHER_TEACHER, "minna-12", true), /reng:lesson_not_found/);
  assert.equal((await archive(TEACHER, "minna-12", true)).status, "archived");
  const hidden = await one<{ version: unknown }>(
    db,
    "select public.read_lesson_version($1, 'minna-12', null) as version",
    [TEACHER],
  );
  assert.equal(hidden.version, null);
  assert.equal((await archive(TEACHER, "minna-12", false)).status, "restored");
  const restored = await one<{ archived_at: string | null }>(
    db,
    "select archived_at from public.lessons where id = 'minna-12'",
  );
  assert.equal(restored.archived_at, null);

  await db.exec("reset role; set role authenticated");
  await assert.rejects(remove(TEACHER, "minna-11"), /permission denied/);
  await assert.rejects(archive(TEACHER, "minna-11", true), /permission denied/);
});
