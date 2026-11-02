import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { endOfVietnamDay, toVietnamDate } from "../lib/daily-practice";

const TEACHER = "00000000-0000-4000-8000-000000000071";
const LEARNER = "00000000-0000-4000-8000-000000000072";
const OTHER_LEARNER = "00000000-0000-4000-8000-000000000073";
const OTHER_TEACHER = "00000000-0000-4000-8000-000000000074";

const FIRST_NEW_MIGRATION = "202611020001";

const choice = (id: string) => ({
  id,
  type: "choice",
  prompt: `どちらが 大きいですか。${id}`,
  options: ["A", "B"],
  multiple: false,
  answer: [0],
  explain: "So sánh bằng より.",
  points: 1,
  tags: [],
});

const lessonContent = (ids: string[]) => ({
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  slides: [{ id: "intro", type: "title", jp: "第12課", vi: "Bài 12" }],
  questions: ids.map(choice),
});

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
  // Applies the migrations a filter selects, in order, so a test can add data in between.
  async function migrate(select: (file: string) => boolean) {
    for (const file of files.sort().filter(select)) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
  }
  async function one<Row>(sql: string, params: unknown[] = []) {
    const result = await db.query<Row>(sql, params);
    assert.equal(result.rows.length, 1, sql);
    return result.rows[0];
  }
  async function addUsers() {
    await db.query(
      "insert into auth.users(id, email_confirmed_at) values ($1, now()), ($2, now()), ($3, now()), ($4, now())",
      [TEACHER, LEARNER, OTHER_LEARNER, OTHER_TEACHER],
    );
    await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
      TEACHER,
      OTHER_TEACHER,
    ]);
  }
  async function publishLesson(id: string, questionIds: string[]) {
    return one<{ id: string }>(
      "select public.publish_lesson($1, $2, 0, $1, '', '', 12, 'minna-1', $3) as id",
      [id, TEACHER, lessonContent(questionIds)],
    );
  }
  return { db, migrate, one, addUsers, publishLesson };
}

test("existing daily practice keeps its source, and a pinned bank survives the next lesson", async () => {
  const { db, migrate, one, addUsers, publishLesson } = await openDatabase();
  try {
    await migrate((file) => file < FIRST_NEW_MIGRATION);
    await addUsers();
    await db.exec("set role service_role");
    const bank = await publishLesson("n5-bank", ["q1", "q2", "q3"]);
    const lesson12 = await publishLesson("minna-12", ["r1", "r2"]);
    const classRow = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'Minna tối', 'ABCDEFGH') returning id",
      [TEACHER],
    );
    await db.query(
      "select public.upsert_class_lesson($1, $2, 'n5-bank', $3, 1, now() - interval '2 minutes')",
      [TEACHER, classRow.id, bank.id],
    );
    await db.query("select public.set_daily_practice($1, $2, 3)", [TEACHER, classRow.id]);
    const tomorrow = toVietnamDate(new Date(Date.now() + 86_400_000));
    await db.query("select public.publish_daily_practice($1, $2, 'n5-bank', $3, $4)", [
      classRow.id,
      tomorrow,
      ["q1", "q2", "q3"],
      endOfVietnamDay(tomorrow),
    ]);
    // The next lesson opens after the bank, which used to take over the daily practice.
    await db.query(
      "select public.upsert_class_lesson($1, $2, 'minna-12', $3, 2, now() - interval '1 minute')",
      [TEACHER, classRow.id, lesson12.id],
    );

    await db.exec("reset role");
    await migrate((file) => file >= FIRST_NEW_MIGRATION);
    await db.exec("set role service_role");
    const pinned = () =>
      one<{ daily_practice_lesson_id: string | null; daily_practice_size: number | null }>(
        "select daily_practice_lesson_id, daily_practice_size from public.classes where id = $1",
        [classRow.id],
      );
    assert.deepEqual(await pinned(), {
      daily_practice_lesson_id: "n5-bank",
      daily_practice_size: 3,
    });

    await db.query("select public.set_daily_practice($1, $2, 60, 'minna-12')", [
      TEACHER,
      classRow.id,
    ]);
    assert.deepEqual(await pinned(), {
      daily_practice_lesson_id: "minna-12",
      daily_practice_size: 60,
    });
    await assert.rejects(
      db.query("select public.set_daily_practice($1, $2, 60, 'lesson-elsewhere')", [
        TEACHER,
        classRow.id,
      ]),
      /reng:lesson_not_in_class/,
    );
    await assert.rejects(
      db.query("select public.set_daily_practice($1, $2, 60, 'n5-bank')", [
        OTHER_TEACHER,
        classRow.id,
      ]),
      /reng:class_not_found/,
    );
    // The previous call shape still works and returns the class to automatic choice.
    await db.query("select public.set_daily_practice($1, $2, 7)", [TEACHER, classRow.id]);
    assert.deepEqual(await pinned(), { daily_practice_lesson_id: null, daily_practice_size: 7 });
    await assert.rejects(
      db.query(
        "update public.classes set daily_practice_lesson_id = 'lesson-elsewhere' where id = $1",
        [classRow.id],
      ),
      /classes_daily_practice_lesson_fkey/,
    );
  } finally {
    await db.close();
  }
});

test("a self-study class enrols only its owner; a teaching class never counts its owner", async () => {
  const { db, migrate, one, addUsers, publishLesson } = await openDatabase();
  try {
    await migrate(() => true);
    await addUsers();
    await db.exec("set role service_role");
    const teaching = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code, capacity) values ($1, 'Minna tối', 'ABCDEFGH', 1) returning id",
      [TEACHER],
    );
    const selfStudy = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code, capacity, join_enabled, self_study) values ($1, 'Tự ôn N4', 'HJKMNPQR', 1, false, true) returning id",
      [TEACHER],
    );
    const members = async (classId: string) =>
      (
        await db.query<{ user_id: string }>(
          "select user_id from public.enrollments where class_id = $1 and left_at is null order by user_id",
          [classId],
        )
      ).rows.map((row) => row.user_id);
    assert.deepEqual(await members(selfStudy.id), [TEACHER], "the owner is enrolled on creation");

    const join = (userId: string, code: string) =>
      one<{ status: string; class_id: string | null }>("select * from public.join_class($1, $2)", [
        userId,
        code,
      ]);
    assert.deepEqual(await join(TEACHER, "ABCDEFGH"), {
      status: "own_class",
      class_id: teaching.id,
    });
    assert.deepEqual(await members(teaching.id), []);

    // An owner who joined before the check (CR-20) neither takes the seat nor blocks capacity.
    await db.query("insert into public.enrollments(class_id, user_id) values ($1, $2)", [
      teaching.id,
      TEACHER,
    ]);
    assert.equal((await join(LEARNER, "ABCDEFGH")).status, "joined");
    assert.equal((await join(OTHER_LEARNER, "ABCDEFGH")).status, "class_full");
    await db.query("update public.classes set capacity = 1 where id = $1", [teaching.id]);

    // Even with joining switched on, a self-study code means nothing to anyone but the owner.
    await db.query("update public.classes set join_enabled = true where id = $1", [selfStudy.id]);
    assert.deepEqual(await join(LEARNER, "HJKMNPQR"), { status: "invalid_code", class_id: null });
    assert.deepEqual(await join(TEACHER, "HJKMNPQR"), {
      status: "already_member",
      class_id: selfStudy.id,
    });

    const version = await publishLesson("minna-12", ["q1", "q2"]);
    const stats = async (classId: string) => {
      await db.query(
        "select public.upsert_class_lesson($1, $2, 'minna-12', $3, 1, now() - interval '1 minute')",
        [TEACHER, classId, version.id],
      );
      const assignment = await one<{ id: string }>(
        "select public.publish_assignment($1, $2, 'minna-12', 'Luyện bài 12', 'practice', null, true, 70, 3, 'after_submit', array['q1', 'q2'], null) as id",
        [TEACHER, classId],
      );
      // The owner gets both questions wrong; in a teaching class that must not count.
      for (const [userId, isCorrect] of [
        [TEACHER, false],
        [LEARNER, true],
      ] as const) {
        const submission = await one<{ id: string }>(
          "insert into public.submissions(assignment_id, user_id, attempt_no, status, score, max_score, passed, is_late, submitted_at) values ($1, $2, 1, 'submitted', $3, 2, $4, false, now()) returning id",
          [assignment.id, userId, isCorrect ? 2 : 0, isCorrect],
        );
        await db.query(
          "insert into public.answers(submission_id, question_id, raw, is_correct, points_earned) values ($1, 'q1', '{}', $2, 0), ($1, 'q2', '{}', $2, 0)",
          [submission.id, isCorrect],
        );
      }
      return (
        await db.query<{ question_id: string; total_count: number }>(
          "select question_id, total_count::int from public.assignment_question_stats($1)",
          [assignment.id],
        )
      ).rows;
    };
    assert.deepEqual(await stats(teaching.id), [], "only the learner's correct answers count");
    // In a self-study class the owner is the learner, so their mistakes are the statistics.
    const selfStats = await stats(selfStudy.id);
    assert.deepEqual(
      selfStats.map((row) => row.question_id),
      ["q1", "q2"],
    );
  } finally {
    await db.close();
  }
});

test("the teaching log belongs to a class lesson version and stays server-only", async () => {
  const { db, migrate, one, addUsers, publishLesson } = await openDatabase();
  try {
    await migrate(() => true);
    await addUsers();
    await db.exec("set role service_role");
    const version = await publishLesson("minna-12", ["q1"]);
    const other = await publishLesson("minna-13", ["q1"]);
    const classRow = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'Minna tối', 'ABCDEFGH') returning id",
      [TEACHER],
    );
    await db.query("select public.upsert_class_lesson($1, $2, 'minna-12', $3, 1, now())", [
      TEACHER,
      classRow.id,
      version.id,
    ]);
    const insert = (lessonId: string | null, versionId: string | null, slide: number | null) =>
      db.query(
        "insert into public.class_sessions(class_id, taught_on, lesson_id, lesson_version_id, slide_reached, notes) values ($1, '2026-11-02', $2, $3, $4, 'Ôn より')",
        [classRow.id, lessonId, versionId, slide],
      );
    await insert("minna-12", version.id, 24);
    await insert(null, null, null);
    await assert.rejects(
      insert("minna-13", other.id, 3),
      /foreign key/,
      "lesson outside the class",
    );
    await assert.rejects(
      insert("minna-12", other.id, 3),
      /foreign key/,
      "version of another lesson",
    );
    await assert.rejects(insert(null, null, 3), /check constraint/, "a slide needs its lesson");
    await assert.rejects(insert("minna-12", null, null), /check constraint/);

    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [TEACHER]);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select * from public.class_sessions"), /permission denied/);
  } finally {
    await db.close();
  }
});

test("classes and copies made before the new checks are brought in line", async () => {
  const { db, migrate, one, addUsers, publishLesson } = await openDatabase();
  try {
    await migrate((file) => file < FIRST_NEW_MIGRATION);
    await addUsers();
    await db.exec("set role service_role");
    const newClass = (name: string, code: string) =>
      one<{ id: string }>(
        "insert into public.classes(teacher_id, name, join_code, capacity) values ($1, $2, $3, 5) returning id",
        [TEACHER, name, code],
      );
    // The teacher joined this class with its own code to study alone (before own_class existed).
    const alone = await newClass("Ôn JLPT N4", "ABCDEFGH");
    const mixed = await newClass("Minna tối", "HJKMNPQR");
    await db.query(
      "insert into public.enrollments(class_id, user_id) values ($1, $3), ($2, $3), ($2, $4)",
      [alone.id, mixed.id, TEACHER, LEARNER],
    );
    // A copy of another teacher's shared lesson that was made public before the app refused it.
    const original = await publishLesson("minna-12", ["q1"]);
    await publishLesson("copied-12", ["q1"]);
    await db.query(
      "update public.lessons set visibility = 'public', copied_from_version_id = $1 where id = 'copied-12'",
      [original.id],
    );

    await db.exec("reset role");
    await migrate((file) => file >= FIRST_NEW_MIGRATION);
    await db.exec("set role service_role");
    const classState = (id: string) =>
      one<{ self_study: boolean; join_enabled: boolean; capacity: number }>(
        "select self_study, join_enabled, capacity from public.classes where id = $1",
        [id],
      );
    assert.deepEqual(await classState(alone.id), {
      self_study: true,
      join_enabled: false,
      capacity: 1,
    });
    assert.deepEqual(await classState(mixed.id), {
      self_study: false,
      join_enabled: true,
      capacity: 5,
    });
    assert.equal(
      (
        await one<{ visibility: string }>(
          "select visibility from public.lessons where id = 'copied-12'",
        )
      ).visibility,
      "class",
    );
    await assert.rejects(
      db.query("select public.set_lesson_visibility($1, 'copied-12', 'public')", [TEACHER]),
      /reng:reshare_not_allowed/,
    );
    await db.query("select public.set_lesson_visibility($1, 'minna-12', 'public')", [TEACHER]);
  } finally {
    await db.close();
  }
});
