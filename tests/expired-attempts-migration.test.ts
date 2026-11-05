import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-000000000071";
const LEARNER = "00000000-0000-4000-8000-000000000072";
const RETAKER = "00000000-0000-4000-8000-000000000073";
const LEAVER = "00000000-0000-4000-8000-000000000074";

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
  for (const id of [TEACHER, LEARNER, RETAKER, LEAVER]) {
    await db.query("insert into auth.users(id, email_confirmed_at) values ($1, now())", [id]);
  }
  await db.query("update public.profiles set role = 'teacher' where id = $1", [TEACHER]);
  await db.exec("set role service_role");
  return db;
}

async function one<Row>(db: PGlite, sql: string, params: unknown[] = []) {
  const result = await db.query<Row>(sql, params);
  assert.equal(result.rows.length, 1, sql);
  return result.rows[0];
}

// Assignments are immutable once published, and publishing refuses a deadline in the past, so
// an assignment whose deadline has passed is written as a draft and then published.
async function insertAssignment(
  db: PGlite,
  classId: string,
  versionId: string,
  title: string,
  dueAt: string,
  allowLate: boolean,
) {
  const assignment = await one<{ id: string }>(
    db,
    `insert into public.assignments(class_id, lesson_id, lesson_version_id, title, mode, due_at,
       allow_late, max_attempts, feedback_policy)
     values ($1, 'minna-11', $2, $3, 'practice', ${dueAt}, $4, 2, 'after_submit') returning id`,
    [classId, versionId, title, allowLate],
  );
  for (const [index, question] of lessonContent.questions.entries()) {
    await db.query(
      "insert into public.assignment_items(assignment_id, question_id, position, question_snapshot) values ($1, $2, $3, $4)",
      [assignment.id, question.id, index + 1, question],
    );
  }
  await db.query(
    "update public.assignments set status = 'published', published_at = now() - interval '1 day' where id = $1",
    [assignment.id],
  );
  return assignment.id;
}

async function openAttempt(db: PGlite, assignmentId: string, userId: string, attemptNo = 1) {
  const draft = { answers: { q1: [0], q2: [1] }, checked: [] };
  return (
    await one<{ id: string }>(
      db,
      "insert into public.submissions(assignment_id, user_id, attempt_no, draft_answers, draft_revision) values ($1, $2, $3, $4, 3) returning id",
      [assignmentId, userId, attemptNo, draft],
    )
  ).id;
}

const RESULTS = [
  { question_id: "q1", raw: [0], is_correct: true, points_earned: 1 },
  { question_id: "q2", raw: [1], is_correct: false, points_earned: 0 },
];

test("attempts left open past a deadline without late work are handed in once, as saved", async () => {
  const db = await openDatabase();
  const version = await one<{ id: string }>(
    db,
    "select public.publish_lesson('minna-11', $1, 0, 'Bài 11', '第11課', 'Đếm', 11, 'minna-1', $2) as id",
    [TEACHER, lessonContent],
  );
  const classRow = await one<{ id: string }>(
    db,
    "insert into public.classes(teacher_id, name, join_code) values ($1, 'Minna tối', 'ABCDEFGH') returning id",
    [TEACHER],
  );
  await db.query("select public.upsert_class_lesson($1, $2, 'minna-11', $3, 1, $4)", [
    TEACHER,
    classRow.id,
    version.id,
    new Date(Date.now() - 86_400_000),
  ]);
  for (const learner of [LEARNER, RETAKER, LEAVER]) {
    const joined = await one<{ status: string }>(db, "select * from public.join_class($1, $2)", [
      learner,
      "ABCDEFGH",
    ]);
    assert.equal(joined.status, "joined");
  }

  const expired = await insertAssignment(
    db,
    classRow.id,
    version.id,
    "Hạn hôm qua",
    "now() - interval '1 hour'",
    false,
  );
  const lateAllowed = await insertAssignment(
    db,
    classRow.id,
    version.id,
    "Cho nộp muộn",
    "now() - interval '1 hour'",
    true,
  );
  const upcoming = await insertAssignment(
    db,
    classRow.id,
    version.id,
    "Hạn ngày mai",
    "now() + interval '1 day'",
    false,
  );

  const learnerAttempt = await openAttempt(db, expired, LEARNER);
  await openAttempt(db, lateAllowed, LEARNER);
  await openAttempt(db, upcoming, LEARNER);
  // The retaker handed in attempt 1 and left attempt 2 open: their chosen score must stay.
  await db.query(
    `insert into public.submissions(assignment_id, user_id, attempt_no, status, score, max_score,
       passed, is_late, submitted_at)
     values ($1, $2, 1, 'submitted', 2, 2, true, false, now() - interval '2 hours')`,
    [expired, RETAKER],
  );
  const retake = await openAttempt(db, expired, RETAKER, 2);
  await openAttempt(db, expired, LEAVER);
  await db.query(
    "update public.enrollments set left_at = now() where class_id = $1 and user_id = $2",
    [classRow.id, LEAVER],
  );

  const listed = await db.query<{ submission_id: string; draft_revision: number }>(
    "select submission_id, draft_revision from public.list_expired_attempts(50)",
  );
  assert.deepEqual(listed.rows, [{ submission_id: learnerAttempt, draft_revision: 3 }]);

  const submit = (submission: string, revision: number, results: unknown, score: number) =>
    one<{ status: string }>(
      db,
      "select * from public.submit_expired_attempt($1, $2, $3, $4, 2, '{\"reps\":0}', 'ts-fsrs-5.4.2')",
      [submission, revision, JSON.stringify(results), score],
    );
  assert.equal((await submit(learnerAttempt, 2, RESULTS, 1)).status, "conflict");
  assert.equal((await submit(learnerAttempt, 3, RESULTS, 2)).status, "invalid_results");
  assert.equal((await submit(retake, 3, RESULTS, 1)).status, "not_expired");
  assert.equal((await submit(learnerAttempt, 3, RESULTS, 1)).status, "submitted");
  assert.equal((await submit(learnerAttempt, 3, RESULTS, 1)).status, "already_submitted");

  const handedIn = await one<{
    status: string;
    score: number;
    is_late: boolean;
    at_deadline: boolean;
    draft_answers: unknown;
  }>(
    db,
    `select s.status, s.score, s.is_late, s.submitted_at = a.due_at as at_deadline, s.draft_answers
     from public.submissions s join public.assignments a on a.id = s.assignment_id
     where s.id = $1`,
    [learnerAttempt],
  );
  assert.deepEqual(handedIn, {
    status: "submitted",
    score: 1,
    is_late: false,
    at_deadline: true,
    draft_answers: { answers: { q1: [0], q2: [1] }, checked: [] },
  });
  assert.equal(
    (
      await one<{ count: number }>(
        db,
        "select count(*)::int as count from public.answers where submission_id = $1",
        [learnerAttempt],
      )
    ).count,
    2,
  );
  const mistakes = await db.query<{ item_id: string }>(
    "select item_id from public.srs_cards where user_id = $1 and item_type = 'mistake'",
    [LEARNER],
  );
  assert.deepEqual(mistakes.rows, [{ item_id: "q2" }]);
  assert.deepEqual(
    (await db.query("select * from public.list_expired_attempts(50)")).rows,
    [],
    "nothing is left once the open attempt is handed in",
  );

  await db.exec("reset role; set role authenticated;");
  await assert.rejects(db.query("select * from public.list_expired_attempts(50)"), /permission/);
  await assert.rejects(
    db.query(
      "select * from public.submit_expired_attempt($1, 3, '[]', 0, 2, '{}', 'ts-fsrs-5.4.2')",
      [retake],
    ),
    /permission/,
  );
});
