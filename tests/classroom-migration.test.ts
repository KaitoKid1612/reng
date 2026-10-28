import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = [
  "202610280001_foundation.sql",
  "202610280002_lesson_publication.sql",
  "202610280003_sample_lessons.sql",
  "202610280004_classroom.sql",
];
const TEACHER = "00000000-0000-4000-8000-000000000001";
const OTHER_TEACHER = "00000000-0000-4000-8000-000000000002";
const STUDENT = "00000000-0000-4000-8000-000000000003";
const OTHER_STUDENT = "00000000-0000-4000-8000-000000000004";
const LATE_STUDENT = "00000000-0000-4000-8000-000000000005";
const REQUEST = "00000000-0000-4000-8000-0000000000aa";

const lessonContent = {
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  slides: [{ id: "intro", type: "title", jp: "日本語", vi: "Tiếng Nhật" }],
  questions: [
    {
      id: "q1",
      type: "choice",
      prompt: "わたし___ がくせいです。",
      options: ["は", "を"],
      multiple: false,
      answer: [0],
      explain: "は đánh dấu chủ đề.",
      points: 1,
      tags: [],
    },
    {
      id: "q2",
      type: "fill",
      prompt: "Viết わたし",
      inputMode: "hiragana",
      kanjiStrict: false,
      answer: ["わたし"],
      explain: "Viết bằng hiragana.",
      points: 2,
      tags: [],
    },
  ],
};
const testQuestion = {
  id: "t1",
  type: "fill",
  prompt: "Viết “tôi” bằng kanji",
  inputMode: "japanese",
  kanjiStrict: true,
  answer: ["私"],
  explain: "PRIVATE_TEST_EXPLANATION",
  points: 3,
  tags: [],
};

async function createDatabase() {
  const db = new PGlite();
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
  for (const file of MIGRATIONS) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }
  return db;
}

test("classroom schema enforces membership, immutability, idempotent attempts and private tests", async () => {
  const db = await createDatabase();
  async function asService() {
    await db.exec("reset role; set role service_role;");
  }
  async function asUser(id: string) {
    await db.exec("reset role;");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    await db.exec("set role authenticated;");
  }
  async function one<Row>(sql: string, params: unknown[] = []) {
    const result = await db.query<Row>(sql, params);
    assert.equal(result.rows.length, 1, sql);
    return result.rows[0];
  }
  try {
    for (const [id, name] of [
      [TEACHER, "Cô Lan"],
      [OTHER_TEACHER, "Thầy Minh"],
      [STUDENT, "Nguyễn Văn Bình"],
      [OTHER_STUDENT, "Lê Thu Hà"],
      [LATE_STUDENT, "Phạm Quốc Huy"],
    ]) {
      await db.query("insert into auth.users(id, email, raw_user_meta_data) values ($1, $2, $3)", [
        id,
        `${id.slice(-2)}@example.test`,
        { full_name: name },
      ]);
    }
    await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
      TEACHER,
      OTHER_TEACHER,
    ]);
    await asService();
    const version = await one<{ id: string }>(
      "select public.publish_lesson('lesson-01', $1, 0, 'Bài 1', 'あいさつ', 'Chào hỏi', 1, 'n5', $2, true) as id",
      [TEACHER, lessonContent],
    );
    assert.equal(
      (await one<{ is_sample: boolean }>("select is_sample from public.lesson_versions")).is_sample,
      true,
    );
    const mainClass = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'N5 Tối thứ Ba', 'ABCDEFGH') returning id",
      [TEACHER],
    );
    const otherClass = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'N5 Sáng', 'HGFEDCBA') returning id",
      [OTHER_TEACHER],
    );
    await assert.rejects(
      db.query(
        "insert into public.classes(teacher_id, name, join_code) values ($1, 'Sai mã', 'ABCD0OIL')",
        [TEACHER],
      ),
    );

    const join = (user: string, code: string) =>
      one<{ status: string; class_id: string | null }>("select * from public.join_class($1, $2)", [
        user,
        code,
      ]);
    assert.deepEqual(await join(STUDENT, "ABCDEFGH"), { status: "joined", class_id: mainClass.id });
    assert.equal((await join(STUDENT, "ABCDEFGH")).status, "already_member");
    assert.equal((await join(TEACHER, "HGFEDCBA")).status, "not_student");
    assert.equal((await join(OTHER_STUDENT, "HGFEDCBA")).status, "joined");
    for (let attempt = 0; attempt < 8; attempt++) {
      assert.deepEqual(await join(LATE_STUDENT, "ZZZZZZZZ"), {
        status: "invalid_code",
        class_id: null,
      });
    }
    assert.equal((await join(LATE_STUDENT, "ABCDEFGH")).status, "rate_limited");
    assert.equal(
      (
        await one<{ count: number }>(
          "select count(*)::int as count from public.join_attempts where user_id = $1",
          [LATE_STUDENT],
        )
      ).count,
      8,
      "rate-limited requests are not recorded as new failures",
    );

    const classLesson = "select public.upsert_class_lesson($1, $2, 'lesson-01', $3, 1, $4)";
    await assert.rejects(
      db.query(classLesson, [OTHER_TEACHER, mainClass.id, version.id, new Date()]),
      /masu:class_not_found/,
    );
    await assert.rejects(
      db.query(classLesson, [OTHER_TEACHER, otherClass.id, version.id, new Date()]),
      /masu:lesson_not_found/,
    );
    await db.query(classLesson, [TEACHER, mainClass.id, version.id, new Date(Date.now() - 1000)]);

    const publish =
      "select public.publish_assignment($1, $2, 'lesson-01', $3, $4, $5, false, 70, $6, $7, $8, $9) as id";
    const due = new Date(Date.now() + 86_400_000);
    const practice = await one<{ id: string }>(publish, [
      TEACHER,
      mainClass.id,
      "Luyện bài 1",
      "practice",
      null,
      2,
      "after_submit",
      ["q2", "q1"],
      null,
    ]);
    const exam = await one<{ id: string }>(publish, [
      TEACHER,
      mainClass.id,
      "Kiểm tra bài 1",
      "test",
      due,
      1,
      "after_due",
      [],
      JSON.stringify([testQuestion]),
    ]);
    await assert.rejects(
      db.query(publish, [
        TEACHER,
        mainClass.id,
        "Hạn đã qua",
        "test",
        new Date(Date.now() - 1000),
        1,
        "after_due",
        [],
        JSON.stringify([testQuestion]),
      ]),
      /masu:due_in_past/,
    );
    await assert.rejects(
      db.query(publish, [
        TEACHER,
        mainClass.id,
        "Câu không có",
        "practice",
        null,
        1,
        "after_submit",
        ["missing"],
        null,
      ]),
      /masu:invalid_items/,
    );
    const items = await db.query<{ question_id: string; position: number }>(
      "select question_id, position from public.assignment_items where assignment_id = $1 order by position",
      [practice.id],
    );
    assert.deepEqual(
      items.rows.map((item) => item.question_id),
      ["q2", "q1"],
    );

    await assert.rejects(
      db.query("update public.assignments set due_at = now() where id = $1", [exam.id]),
      /assignment_immutable/,
    );
    await assert.rejects(
      db.query(
        "update public.assignment_items set question_snapshot = question_snapshot where assignment_id = $1",
        [practice.id],
      ),
      /assignment_immutable/,
    );
    await assert.rejects(
      db.query(
        'insert into public.assignment_items(assignment_id, question_id, position, question_snapshot) values ($1, \'x\', 9, \'{"id":"x","type":"fill","points":1}\')',
        [practice.id],
      ),
      /assignment_immutable/,
    );
    await db.query("update public.assignments set title = 'Luyện chào hỏi' where id = $1", [
      practice.id,
    ]);

    const start = (user: string, assignment: string) =>
      one<{ status: string; submission_id: string | null }>(
        "select * from public.start_attempt($1, $2)",
        [user, assignment],
      );
    assert.equal((await start(OTHER_STUDENT, practice.id)).status, "not_found");
    const first = await start(STUDENT, practice.id);
    assert.equal(first.status, "started");
    assert.deepEqual(await start(STUDENT, practice.id), {
      status: "resumed",
      submission_id: first.submission_id,
    });
    await assert.rejects(
      db.query(
        "insert into public.submissions(assignment_id, user_id, attempt_no) values ($1, $2, 9)",
        [practice.id, STUDENT],
      ),
      "only one open attempt may exist",
    );

    const save = (submission: string | null, revision: number, draft: unknown) =>
      one<{ status: string; revision: number }>(
        "select status, revision from public.save_attempt_draft($1, $2, $3, $4)",
        [STUDENT, submission, revision, draft],
      );
    const draft = { answers: { q1: [1], q2: "わたし" }, checked: [] };
    assert.deepEqual(await save(first.submission_id, 0, draft), { status: "saved", revision: 1 });
    assert.deepEqual(await save(first.submission_id, 0, draft), {
      status: "conflict",
      revision: 1,
    });

    const submit = (submission: string | null, revision: number, results: unknown, score: number) =>
      one<{ status: string }>(
        "select * from public.submit_attempt($1, $2, $3, $4, $5, $6, 3, '{\"reps\":0}', 'ts-fsrs-5.4.2')",
        [STUDENT, submission, revision, draft, JSON.stringify(results), score],
      );
    const results = [
      { question_id: "q1", raw: [1], is_correct: false, points_earned: 0 },
      { question_id: "q2", raw: "わたし", is_correct: true, points_earned: 2 },
    ];
    assert.equal(
      (
        await submit(
          first.submission_id,
          1,
          [{ ...results[0], points_earned: 5, is_correct: true }, results[1]],
          7,
        )
      ).status,
      "invalid_results",
      "points must match the snapshot",
    );
    assert.equal((await submit(first.submission_id, 0, results, 2)).status, "conflict");
    assert.equal((await submit(first.submission_id, 1, results, 2)).status, "submitted");
    assert.equal((await submit(first.submission_id, 1, results, 2)).status, "already_submitted");
    const graded = await one<{ score: number; passed: boolean; is_late: boolean }>(
      "select score, passed, is_late from public.submissions where id = $1",
      [first.submission_id],
    );
    assert.deepEqual(graded, { score: 2, passed: false, is_late: false });
    assert.equal(
      (await one<{ count: number }>("select count(*)::int as count from public.answers")).count,
      2,
    );
    assert.equal(
      (await one<{ count: number }>("select count(*)::int as count from public.srs_cards")).count,
      1,
    );
    await assert.rejects(
      db.query("update public.submissions set score = 3 where id = $1", [first.submission_id]),
      /submission_immutable/,
    );
    await assert.rejects(db.exec("delete from public.answers"), /history_immutable/);

    const second = await start(STUDENT, practice.id);
    assert.equal(second.status, "started");
    const allCorrect = [
      { question_id: "q1", raw: [0], is_correct: true, points_earned: 1 },
      { question_id: "q2", raw: "わたし", is_correct: true, points_earned: 2 },
    ];
    assert.equal((await submit(second.submission_id, 0, allCorrect, 3)).status, "submitted");
    assert.equal((await start(STUDENT, practice.id)).status, "no_attempts_left");

    const examAttempt = await start(STUDENT, exam.id);
    assert.equal(examAttempt.status, "started");
    const examResults = [{ question_id: "t1", raw: "わたし", is_correct: false, points_earned: 0 }];
    await db.query(
      "select * from public.submit_attempt($1, $2, 0, '{}', $3, 0, 3, '{}', 'ts-fsrs-5.4.2')",
      [STUDENT, examAttempt.submission_id, JSON.stringify(examResults)],
    );
    const examMistake = await one<{ due: Date }>(
      "select due from public.srs_cards where source_id = $1",
      [exam.id],
    );
    assert.ok(examMistake.due.getTime() >= due.getTime() - 1, "test mistakes wait for feedback");

    const stats = await db.query<{ question_id: string; wrong_count: number; total_count: number }>(
      "select question_id, wrong_count::int, total_count::int from public.assignment_question_stats($1)",
      [practice.id],
    );
    assert.deepEqual(stats.rows, [], "only the latest attempt counts and it was fully correct");

    await db.query("update public.assignments set status = 'closed' where id = $1", [practice.id]);
    await assert.rejects(
      db.query("update public.assignments set status = 'published' where id = $1", [practice.id]),
      /assignment_immutable/,
    );

    const overdue = await one<{ id: string }>(
      "insert into public.assignments(class_id, lesson_id, lesson_version_id, title, mode, due_at, allow_late, feedback_policy) values ($1, 'lesson-01', $2, 'Quá hạn', 'practice', now() - interval '1 hour', false, 'after_submit') returning id",
      [mainClass.id, version.id],
    );
    await db.query(
      "update public.assignments set status = 'published', published_at = now() - interval '2 hours' where id = $1",
      [overdue.id],
    );
    assert.equal((await start(STUDENT, overdue.id)).status, "past_due");

    const vocabReview =
      "select status, revision from public.record_review($1, 'vocab', 'lesson-01', 'v0101', $2, $3, 3, null, '{}', now(), 0, false, 'ts-fsrs-5.4.2')";
    assert.deepEqual(await one(vocabReview, [STUDENT, REQUEST, null]), {
      status: "recorded",
      revision: 1,
    });
    assert.deepEqual(await one(vocabReview, [STUDENT, REQUEST, null]), {
      status: "duplicate",
      revision: 1,
    });
    assert.deepEqual(await one(vocabReview, [STUDENT, "00000000-0000-4000-8000-0000000000ab", 7]), {
      status: "conflict",
      revision: 1,
    });
    assert.equal(
      (
        await one<{ status: string }>(
          "select status from public.record_review($1, 'mistake', 'missing', 'q1', $2, null, 1, false, '{}', now(), 0, false, 'ts-fsrs-5.4.2')",
          [STUDENT, "00000000-0000-4000-8000-0000000000ac"],
        )
      ).status,
      "not_found",
    );

    const roster = await db.query<{ full_name: string; email: string }>(
      "select full_name, email from public.class_roster($1)",
      [mainClass.id],
    );
    assert.deepEqual(roster.rows, [{ full_name: "Nguyễn Văn Bình", email: "03@example.test" }]);

    await asUser(STUDENT);
    for (const table of ["assignment_items", "submissions", "answers", "classes", "enrollments"]) {
      assert.equal(
        (await db.query(`select * from public.${table}`)).rows.length,
        0,
        `students read ${table} only through the server`,
      );
    }
    assert.equal((await db.query("select * from public.srs_cards")).rows.length, 3);
    await assert.rejects(db.exec("select * from public.join_attempts"));
    await assert.rejects(
      db.query("update public.srs_cards set correct_streak = 3 where user_id = $1", [STUDENT]),
    );
    await assert.rejects(
      db.query("select * from public.submit_attempt($1, $2, 0, '{}', '[]', 0, 1, '{}', 'x')", [
        STUDENT,
        examAttempt.submission_id,
      ]),
    );

    await asUser(OTHER_STUDENT);
    assert.equal((await db.query("select * from public.srs_cards")).rows.length, 0);

    await asUser(TEACHER);
    assert.equal((await db.query("select * from public.classes")).rows.length, 1);
    assert.equal((await db.query("select * from public.submissions")).rows.length, 3);
    const visibleProfiles = await db.query<{ id: string }>("select id from public.profiles");
    assert.deepEqual(visibleProfiles.rows.map((row) => row.id).sort(), [TEACHER, STUDENT].sort());
    assert.equal((await db.query("select * from public.srs_cards")).rows.length, 0);
    await assert.rejects(
      db.query(
        "insert into public.classes(teacher_id, name, join_code) values ($1, 'x', 'KKKKKKKK')",
        [TEACHER],
      ),
    );

    await asUser(OTHER_TEACHER);
    assert.equal(
      (await db.query("select * from public.submissions")).rows.length,
      0,
      "teachers cannot read another teacher's class results",
    );
    assert.equal(
      (await db.query("select * from public.profiles where id = $1", [STUDENT])).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
