import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const MIGRATION = "20261125084314_merge_repeated_mistakes.sql";
const TEACHER = "00000000-0000-4000-8000-0000000000e1";
const LEARNER = "00000000-0000-4000-8000-0000000000e2";

const choice = (id: string) => ({
  id,
  type: "choice",
  prompt: `Câu ${id}.`,
  options: ["A", "B"],
  answer: [0],
  multiple: false,
  points: 1,
  tags: ["kanji-reading"],
  explain: "A đúng.",
});

const content = {
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  slides: [{ id: "s1", type: "title", jp: "第1課", vi: "Bài 1" }],
  questions: [choice("q1"), choice("q2")],
};

test("a question missed again in the same lesson reopens its mistake card instead of adding one", async () => {
  const db = new PGlite();
  async function one<Row>(sql: string, params: unknown[] = []) {
    const result = await db.query<Row>(sql, params);
    assert.equal(result.rows.length, 1, sql);
    return result.rows[0];
  }
  const cards = async () =>
    (
      await db.query<{ source_id: string; item_id: string; streak: number; open: boolean }>(
        `select source_id, item_id, correct_streak as streak, resolved_at is null as open
         from public.srs_cards where user_id = $1 and item_type = 'mistake'
         order by created_at, source_id, item_id`,
        [LEARNER],
      )
    ).rows;
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
    const files = (await readdir("supabase/migrations"))
      .filter((file) => file.endsWith(".sql") && file <= MIGRATION)
      .sort();
    for (const file of files) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    for (const [id, name] of [
      [TEACHER, "Cô Lan"],
      [LEARNER, "Nguyên"],
    ]) {
      await db.query(
        "insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data) values ($1, $2, now(), $3)",
        [id, `${id.slice(-2)}@example.test`, { full_name: name }],
      );
    }
    await db.query("update public.profiles set role = 'teacher' where id = $1", [TEACHER]);
    await db.exec("set role service_role");
    const version = await one<{ id: string }>(
      "select public.publish_lesson('bank', $1, 0, 'Ngân hàng', '', '', 1, 'n5', $2) as id",
      [TEACHER, content],
    );
    const other = await one<{ id: string }>(
      "select public.publish_lesson('other', $1, 0, 'Bài khác', '', '', 2, 'n5', $2) as id",
      [TEACHER, content],
    );
    const classRow = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'N5', 'ABCDEFGH') returning id",
      [TEACHER],
    );
    await db.query("select * from public.join_class($1, 'ABCDEFGH')", [LEARNER]);
    const past = new Date(Date.now() - 1000);
    await db.query("select public.upsert_class_lesson($1, $2, 'bank', $3, 1, $4)", [
      TEACHER,
      classRow.id,
      version.id,
      past,
    ]);
    await db.query("select public.upsert_class_lesson($1, $2, 'other', $3, 2, $4)", [
      TEACHER,
      classRow.id,
      other.id,
      past,
    ]);
    const practice = async (lessonId: string, title: string) =>
      (
        await one<{ id: string }>(
          "select public.publish_assignment($1, $2, $3, $4, 'practice', null, false, 70, 2, 'after_submit', $5, null) as id",
          [TEACHER, classRow.id, lessonId, title, ["q1", "q2"]],
        )
      ).id;
    // q1 wrong, q2 right.
    const answerWrong = async (assignmentId: string) => {
      const started = await one<{ submission_id: string }>(
        "select * from public.start_attempt($1, $2)",
        [LEARNER, assignmentId],
      );
      const submitted = await one<{ status: string }>(
        "select * from public.submit_attempt($1, $2, 0, '{}', $3, 1, 2, '{}', 'ts-fsrs-5.4.2')",
        [
          LEARNER,
          started.submission_id,
          JSON.stringify([
            { question_id: "q1", raw: [1], is_correct: false, points_earned: 0 },
            { question_id: "q2", raw: [0], is_correct: true, points_earned: 1 },
          ]),
        ],
      );
      assert.equal(submitted.status, "submitted");
    };

    const monday = await practice("bank", "Luyện tập hằng ngày 24/11");
    await answerWrong(monday);
    const tuesday = await practice("bank", "Luyện tập hằng ngày 25/11");
    await answerWrong(tuesday);
    assert.deepEqual(await cards(), [{ source_id: monday, item_id: "q1", streak: 0, open: true }]);

    // A card the learner had learned opens again when the question is missed again.
    await db.query(
      "update public.srs_cards set correct_streak = 3, resolved_at = now() where user_id = $1",
      [LEARNER],
    );
    await answerWrong(await practice("bank", "Luyện tập hằng ngày 26/11"));
    assert.deepEqual(await cards(), [{ source_id: monday, item_id: "q1", streak: 0, open: true }]);

    // A retake of the same assignment still updates that assignment's own card.
    await answerWrong(monday);
    assert.equal((await cards()).length, 1);

    // Another lesson's question with the same ID is another question.
    const otherWork = await practice("other", "Bài khác");
    await answerWrong(otherWork);
    assert.deepEqual(
      (await cards()).map((card) => card.source_id),
      [monday, otherWork],
    );

    // A mock exam whose results wait for its deadline keeps its own, still hidden, card.
    const due = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const exam = await one<{ id: string }>(
      "select public.publish_jlpt_mock_exam($1, $2, 'bank', 'Thi thử', 'N5', $3, 90, 'after_due', $4) as id",
      [TEACHER, classRow.id, due, ["q1", "q2"]],
    );
    await answerWrong(exam.id);
    const examCards = (await cards()).filter((card) => card.source_id === exam.id);
    assert.deepEqual(examCards, [{ source_id: exam.id, item_id: "q1", streak: 0, open: true }]);
  } finally {
    await db.close();
  }
});
