import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-0000000000b1";
const LEARNER = "00000000-0000-4000-8000-0000000000b2";

const question = (index: number) => ({
  id: `q${index}`,
  type: "choice",
  prompt: `Câu ${index}`,
  options: ["1", "2", "3", "4"],
  multiple: false,
  answer: [0],
  explain: "1.",
  points: 1,
  tags: ["文字・語彙", "official:jlpt-2018"],
});

// Migration 20261111042428: an official workbook test (N5 91, N4 98 questions) fits one exam,
// and the exam opens while its source lesson stays closed to learners.
test("an official test is one exam of up to 100 questions that opens before its lesson", async () => {
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
  for (const id of [TEACHER, LEARNER]) {
    await db.query("insert into auth.users(id, email_confirmed_at) values ($1, now())", [id]);
  }
  await db.query("update public.profiles set role = 'teacher' where id = $1", [TEACHER]);
  const questions = Array.from({ length: 101 }, (_, index) => question(index + 1));
  const content = {
    schemaVersion: 1,
    vocab: [],
    grammar: [],
    slides: [{ id: "intro", type: "title", jp: "N4", vi: "Đề chính thức" }],
    questions,
  };
  const version = (
    await db.query<{ id: string }>(
      "select public.publish_lesson('official', $1, 0, 'Đề chính thức', 'N4', 'Đề', 1, 'n4', $2) as id",
      [TEACHER, content],
    )
  ).rows[0].id;
  const classId = (
    await db.query<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'N4', 'HGFEDCBA') returning id",
      [TEACHER],
    )
  ).rows[0].id;
  // The lesson opens after the real test, so learners cannot read the questions before.
  await db.query(
    "select public.upsert_class_lesson($1, $2, 'official', $3, 1, now() + interval '30 days')",
    [TEACHER, classId, version],
  );
  await db.query("insert into public.enrollments(class_id, user_id) values ($1, $2)", [
    classId,
    LEARNER,
  ]);
  // A regular test of the closed lesson still waits for it.
  const regular = (
    await db.query<{ id: string }>(
      `insert into public.assignments(class_id, lesson_id, lesson_version_id, title, mode, due_at, feedback_policy)
       values ($1, 'official', $2, 'Kiểm tra thường', 'test', now() + interval '2 days', 'after_submit') returning id`,
      [classId, version],
    )
  ).rows[0].id;
  await db.query(
    "insert into public.assignment_items(assignment_id, question_id, position, question_snapshot) values ($1, 'q1', 1, $2)",
    [regular, questions[0]],
  );
  await db.query(
    "update public.assignments set status = 'published', published_at = now() where id = $1",
    [regular],
  );
  await db.exec("set role service_role");
  const publish = (count: number) =>
    db.query<{ id: string }>(
      `select public.publish_jlpt_mock_exam($1, $2, 'official', 'Đề chính thức N4', 'N4', now() + interval '7 days', 115, 'after_submit', $3) as id`,
      [TEACHER, classId, questions.slice(0, count).map((item) => item.id)],
    );
  const exam = (await publish(98)).rows[0].id;
  const items = (
    await db.query<{ count: number; first: string; last: string }>(
      `select count(*)::int as count,
         (select question_id from public.assignment_items where assignment_id = $1 and position = 1) as first,
         (select question_id from public.assignment_items where assignment_id = $1 and position = 98) as last
       from public.assignment_items where assignment_id = $1`,
      [exam],
    )
  ).rows[0];
  assert.deepEqual(items, { count: 98, first: "q1", last: "q98" }, "every question, in order");
  assert.ok((await publish(100)).rows[0].id);
  await assert.rejects(publish(101), /invalid_items/);
  await assert.rejects(publish(0), /invalid_items/);

  const start = async (assignmentId: string) =>
    (
      await db.query<{ status: string }>("select status from public.start_attempt($1, $2)", [
        LEARNER,
        assignmentId,
      ])
    ).rows[0].status;
  assert.equal(await start(exam), "started", "the exam opens before its lesson");
  assert.equal(await start(regular), "not_available", "other work waits for the lesson");
});
