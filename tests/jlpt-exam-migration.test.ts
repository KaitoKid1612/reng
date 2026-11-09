import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-0000000000a1";
const OTHER_TEACHER = "00000000-0000-4000-8000-0000000000a2";
const LEARNER = "00000000-0000-4000-8000-0000000000a3";

const vocabulary = {
  id: "v1",
  type: "choice",
  prompt: "「学校」の読み方は？",
  options: ["がっこう", "がくこう"],
  multiple: false,
  answer: [0],
  explain: "学校: trường học.",
  points: 1,
  tags: ["文字・語彙"],
};
const grammar = {
  id: "g1",
  type: "choice",
  prompt: "わたしは 学生（　）。",
  options: ["です", "でした"],
  multiple: false,
  answer: [0],
  explain: "です: là.",
  points: 1,
  tags: ["文法"],
};
const listening = {
  id: "l1",
  type: "listen",
  prompt: "Nghe và chọn.",
  options: ["A", "B"],
  answer: [1],
  explain: "B.",
  points: 1,
  tags: ["listening"],
  transcript: "B です。",
  audio: { key: "lessons/0123456789abcdef0123456789abcdef.mp3" },
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
  for (const id of [TEACHER, OTHER_TEACHER, LEARNER]) {
    await db.query("insert into auth.users(id, email_confirmed_at) values ($1, now())", [id]);
  }
  await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
    TEACHER,
    OTHER_TEACHER,
  ]);
  return db;
}

test("JLPT mock exams are one timed attempt, closed a minute after the limit and handed in at it", async () => {
  const db = await openDatabase();
  const content = {
    schemaVersion: 1,
    vocab: [],
    grammar: [],
    slides: [{ id: "intro", type: "title", jp: "N5", vi: "Ôn N5" }],
    questions: [vocabulary, grammar, listening],
  };
  const version = (
    await db.query<{ id: string }>(
      "select public.publish_lesson('n5-bank', $1, 0, 'Ôn N5', 'N5', 'Ngân hàng ôn', 1, 'n5', $2) as id",
      [TEACHER, content],
    )
  ).rows[0].id;
  const classId = (
    await db.query<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'N5', 'ABCDEFGH') returning id",
      [TEACHER],
    )
  ).rows[0].id;
  await db.query("select public.upsert_class_lesson($1, $2, 'n5-bank', $3, 1, now())", [
    TEACHER,
    classId,
    version,
  ]);
  await db.query("insert into public.enrollments(class_id, user_id) values ($1, $2)", [
    classId,
    LEARNER,
  ]);
  // A regular test of the same class: its attempts are not affected by exam time limits.
  const regular = (
    await db.query<{ id: string }>(
      `insert into public.assignments(class_id, lesson_id, lesson_version_id, title, mode, due_at, feedback_policy)
       values ($1, 'n5-bank', $2, 'Kiểm tra thường', 'test', now() + interval '2 days', 'after_submit') returning id`,
      [classId, version],
    )
  ).rows[0].id;
  await db.query(
    "insert into public.assignment_items(assignment_id, question_id, position, question_snapshot) values ($1, 'v1', 1, $2)",
    [regular, vocabulary],
  );
  await db.query(
    "update public.assignments set status = 'published', published_at = now() where id = $1",
    [regular],
  );
  await db.exec("set role service_role");

  const publish = (
    teacher: string,
    overrides: Partial<{
      lesson: string;
      level: string;
      due: string;
      minutes: number;
      feedback: string;
      ids: string[];
    }> = {},
  ) =>
    db.query<{ id: string }>(
      `select public.publish_jlpt_mock_exam($1, $2, $3, 'Thi thử JLPT N5', $4, now() + $5::interval, $6, $7, $8) as id`,
      [
        teacher,
        classId,
        overrides.lesson ?? "n5-bank",
        overrides.level ?? "N5",
        overrides.due ?? "7 days",
        overrides.minutes ?? 90,
        overrides.feedback ?? "after_submit",
        overrides.ids ?? ["v1", "g1", "l1"],
      ],
    );
  await assert.rejects(publish(OTHER_TEACHER), /class_not_found/);
  await assert.rejects(publish(TEACHER, { level: "N3" }), /invalid_input/);
  await assert.rejects(publish(TEACHER, { minutes: 3 }), /invalid_input/);
  await assert.rejects(publish(TEACHER, { feedback: "never" }), /invalid_input/);
  await assert.rejects(publish(TEACHER, { due: "-1 hour" }), /due_in_past/);
  await assert.rejects(publish(TEACHER, { lesson: "other" }), /lesson_not_in_class/);
  await assert.rejects(publish(TEACHER, { ids: ["v1", "missing"] }), /invalid_items/);
  await assert.rejects(publish(TEACHER, { ids: ["v1", "v1"] }), /invalid_items/);

  const examId = (await publish(TEACHER)).rows[0].id;
  const exam = (
    await db.query<Record<string, unknown>>(
      "select mode, status, max_attempts, allow_late, pass_score from public.assignments where id = $1",
      [examId],
    )
  ).rows[0];
  assert.deepEqual(exam, {
    mode: "test",
    status: "published",
    max_attempts: 1,
    allow_late: false,
    pass_score: 45,
  });
  assert.deepEqual(
    (
      await db.query<{ question_id: string }>(
        "select question_id from public.assignment_items where assignment_id = $1 order by position",
        [examId],
      )
    ).rows.map((row) => row.question_id),
    ["v1", "g1", "l1"],
    "the exam keeps the section order it was given",
  );
  assert.deepEqual(
    (
      await db.query(
        "select level, time_limit_minutes from public.assignment_exams where assignment_id = $1",
        [examId],
      )
    ).rows[0],
    { level: "N5", time_limit_minutes: 90 },
  );
  await assert.rejects(
    db.query(
      "insert into public.assignment_exams(assignment_id, level, time_limit_minutes) values ($1, 'N4', 5)",
      [regular],
    ),
    /assignment_immutable/,
    "a given assignment does not gain a time limit afterwards",
  );
  await assert.rejects(
    db.query(
      "update public.assignment_exams set time_limit_minutes = 500 where assignment_id = $1",
      [examId],
    ),
    /permission denied/,
  );

  const start = async (assignment: string) =>
    (
      await db.query<{ status: string; submission_id: string }>(
        "select * from public.start_attempt($1, $2)",
        [LEARNER, assignment],
      )
    ).rows[0];
  const started = await start(examId);
  assert.equal(started.status, "started");
  const submission = started.submission_id;
  const save = async (id: string) =>
    (
      await db.query<{ status: string }>(
        "select * from public.save_attempt_draft($1, $2, (select draft_revision from public.submissions where id = $2), $3)",
        [LEARNER, id, { answers: { v1: [0] }, checked: [] }],
      )
    ).rows[0].status;
  // Time passing: started_at moves back, past the guard that keeps it fixed in the app.
  const moveStart = async (id: string, minutesAgo: number) => {
    await db.exec("reset role; alter table public.submissions disable trigger submission_guard");
    await db.query(
      "update public.submissions set started_at = now() - make_interval(secs => $2) where id = $1",
      [id, minutesAgo * 60],
    );
    await db.exec(
      "alter table public.submissions enable trigger submission_guard; set role service_role",
    );
  };
  assert.equal(await save(submission), "saved");
  await moveStart(submission, 90.5);
  assert.equal(await save(submission), "saved", "the minute after the limit still saves");
  const listed = async () =>
    (
      await db.query<{ submission_id: string }>("select * from public.list_expired_attempts(50)")
    ).rows.map((row) => row.submission_id);
  assert.ok(!(await listed()).includes(submission));
  await moveStart(submission, 92);
  assert.equal(await save(submission), "past_due");
  assert.ok((await listed()).includes(submission));

  const results = [
    { question_id: "v1", raw: [0], is_correct: true, points_earned: 1 },
    { question_id: "g1", raw: null, is_correct: false, points_earned: 0 },
    { question_id: "l1", raw: null, is_correct: false, points_earned: 0, listen_count: 1 },
  ];
  const handIn = async (id: string) =>
    (
      await db.query<{ status: string }>(
        "select * from public.submit_expired_attempt($1, (select draft_revision from public.submissions where id = $1), $2, 1, 3, '{}'::jsonb, 'fsrs-test')",
        [id, results],
      )
    ).rows[0].status;
  assert.equal(await handIn(submission), "submitted");
  const handedIn = (
    await db.query<{ late: boolean; at_limit: boolean; score: number }>(
      "select is_late as late, submitted_at = started_at + interval '90 minutes' as at_limit, score from public.submissions where id = $1",
      [submission],
    )
  ).rows[0];
  assert.deepEqual(handedIn, { late: false, at_limit: true, score: 1 });
  assert.equal((await start(examId)).status, "no_attempts_left", "a mock exam has one attempt");

  // A test shown after its deadline keeps the mistakes of a timed-out attempt hidden until then.
  const laterExam = (await publish(TEACHER, { feedback: "after_due", minutes: 30 })).rows[0].id;
  const second = (await start(laterExam)).submission_id;
  await moveStart(second, 10);
  assert.equal(await handIn(second), "not_expired", "time is not up yet");
  await moveStart(second, 32);
  assert.equal(await handIn(second), "submitted");
  const hidden = (
    await db.query<{ hidden: boolean }>(
      "select bool_and(due > now() + interval '6 days') as hidden from public.srs_cards where source_id = $1",
      [laterExam],
    )
  ).rows[0];
  assert.equal(hidden.hidden, true);

  // The regular test has no time limit: an attempt started hours ago still saves before its due.
  const regularAttempt = (await start(regular)).submission_id;
  await moveStart(regularAttempt, 300);
  assert.equal(await save(regularAttempt), "saved");
  assert.ok(!(await listed()).includes(regularAttempt));

  await db.exec("reset role; set role authenticated");
  await assert.rejects(db.query("select * from public.assignment_exams"), /permission denied/);
  await assert.rejects(
    db.query(
      "select public.publish_jlpt_mock_exam($1, $2, 'n5-bank', 'x', 'N5', now() + interval '1 day', 90, 'after_submit', array['v1'])",
      [TEACHER, classId],
    ),
    /permission denied/,
  );
  await db.close();
});
