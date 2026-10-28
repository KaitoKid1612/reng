import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = [
  "202610280001_foundation.sql",
  "202610280002_lesson_publication.sql",
  "202610280003_sample_lessons.sql",
  "202610280004_classroom.sql",
  "202610280005_notifications.sql",
  "202610280006_listening.sql",
];
const TEACHER = "00000000-0000-4000-8000-000000000001";
const STUDENT = "00000000-0000-4000-8000-000000000003";
const OTHER_STUDENT = "00000000-0000-4000-8000-000000000004";

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
      id: "l1",
      type: "listen",
      prompt: "Người nói đi đâu?",
      responseType: "choice",
      audio: "a".repeat(32),
      transcript: "がっこうへいきます。",
      maxListens: null,
      options: ["がっこう", "えき"],
      answer: [0],
      explain: "がっこう là trường học.",
      points: 1,
      tags: [],
    },
    {
      id: "d1",
      type: "dictation",
      prompt: "Nghe và viết lại",
      audio: "b".repeat(32),
      transcript: "わたしはがくせいです。",
      maxListens: null,
      inputMode: "hiragana",
      kanjiStrict: false,
      answer: ["わたしはがくせいです"],
      explain: "Câu giới thiệu.",
      points: 2,
      tags: [],
    },
  ],
};

test("submissions keep bounded listen counts and reports summarize the latest listening answers", async () => {
  const db = new PGlite();
  async function one<Row>(sql: string, params: unknown[] = []) {
    const result = await db.query<Row>(sql, params);
    assert.equal(result.rows.length, 1, sql);
    return result.rows[0];
  }
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
    for (const file of MIGRATIONS) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    for (const [id, name] of [
      [TEACHER, "Cô Lan"],
      [STUDENT, "Nguyễn Văn Bình"],
      [OTHER_STUDENT, "Lê Thu Hà"],
    ]) {
      await db.query("insert into auth.users(id, email, raw_user_meta_data) values ($1, $2, $3)", [
        id,
        `${id.slice(-2)}@example.test`,
        { full_name: name },
      ]);
    }
    await db.query("update public.profiles set role = 'teacher' where id = $1", [TEACHER]);
    await db.exec("set role service_role;");
    const version = await one<{ id: string }>(
      "select public.publish_lesson('lesson-01', $1, 0, 'Bài 1', 'あいさつ', 'Chào hỏi', 1, 'n5', $2) as id",
      [TEACHER, lessonContent],
    );
    const classRow = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'N5 Tối', 'ABCDEFGH') returning id",
      [TEACHER],
    );
    for (const user of [STUDENT, OTHER_STUDENT]) {
      await db.query("select * from public.join_class($1, 'ABCDEFGH')", [user]);
    }
    await db.query("select public.upsert_class_lesson($1, $2, 'lesson-01', $3, 1, $4)", [
      TEACHER,
      classRow.id,
      version.id,
      new Date(Date.now() - 1000),
    ]);
    const assignment = await one<{ id: string }>(
      "select public.publish_assignment($1, $2, 'lesson-01', 'Luyện nghe', 'practice', null, false, 70, 2, 'after_submit', $3, null) as id",
      [TEACHER, classRow.id, ["q1", "l1", "d1"]],
    );

    const start = async (user: string) =>
      (
        await one<{ submission_id: string }>("select * from public.start_attempt($1, $2)", [
          user,
          assignment.id,
        ])
      ).submission_id;
    const submit = async (user: string, submission: string, results: object[]) => {
      const score = results.reduce(
        (total, item) => total + ("points_earned" in item ? Number(item.points_earned) : 0),
        0,
      );
      return (
        await one<{ status: string }>(
          "select * from public.submit_attempt($1, $2, 0, '{}', $3, $4, 4, '{}', 'ts-fsrs-5.4.2')",
          [user, submission, JSON.stringify(results), score],
        )
      ).status;
    };
    const result = (questionId: string, points: number, listenCount?: unknown) => ({
      question_id: questionId,
      raw: questionId === "d1" ? "わたし" : [0],
      is_correct: points > 0,
      points_earned: points,
      ...(listenCount === undefined ? {} : { listen_count: listenCount }),
    });

    const first = await start(STUDENT);
    for (const [label, listens] of [
      ["choice questions have no audio", { q1: 1 }],
      ["counts stay within the recorded range", { l1: 101 }],
      ["counts are whole numbers", { l1: 1.5 }],
      ["counts are JSON numbers", { l1: "2" }],
      ["counts are not negative", { d1: -1 }],
    ] as const) {
      const listenOf = (id: string) => (listens as Record<string, unknown>)[id];
      assert.equal(
        await submit(STUDENT, first, [
          result("q1", 1, listenOf("q1")),
          result("l1", 1, listenOf("l1")),
          result("d1", 0, listenOf("d1")),
        ]),
        "invalid_results",
        label,
      );
    }
    assert.equal(
      await submit(STUDENT, first, [result("q1", 1), result("l1", 1, 3), result("d1", 0, 1)]),
      "submitted",
    );
    const stored = await db.query<{ question_id: string; listen_count: number }>(
      "select question_id, listen_count from public.answers where submission_id = $1 order by question_id",
      [first],
    );
    assert.deepEqual(
      stored.rows.map((row) => [row.question_id, row.listen_count]),
      [
        ["d1", 1],
        ["l1", 3],
        ["q1", 0],
      ],
    );

    // The report uses the latest attempt: here only the dictation is wrong.
    const second = await start(STUDENT);
    assert.equal(
      await submit(STUDENT, second, [result("q1", 1), result("l1", 1, 1), result("d1", 0, 2)]),
      "submitted",
    );
    const other = await start(OTHER_STUDENT);
    assert.equal(
      await submit(OTHER_STUDENT, other, [result("q1", 0), result("l1", 0, 5), result("d1", 0, 5)]),
      "submitted",
    );
    const summary = await db.query<{
      user_id: string;
      points_earned: number;
      max_points: number;
      listen_total: number;
      answer_count: number;
    }>(
      `select user_id, points_earned::int, max_points::int, listen_total::int, answer_count::int
       from public.class_listening_summary($1) order by user_id`,
      [classRow.id],
    );
    assert.deepEqual(summary.rows, [
      { user_id: STUDENT, points_earned: 1, max_points: 3, listen_total: 3, answer_count: 2 },
      {
        user_id: OTHER_STUDENT,
        points_earned: 0,
        max_points: 3,
        listen_total: 10,
        answer_count: 2,
      },
    ]);

    await db.exec("reset role;");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [TEACHER]);
    await db.exec("set role authenticated;");
    await assert.rejects(
      db.query("select * from public.class_listening_summary($1)", [classRow.id]),
      /permission denied/,
      "reports are read through the server only",
    );
  } finally {
    await db.close();
  }
});
