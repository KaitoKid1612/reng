import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-000000000081";
const OTHER_TEACHER = "00000000-0000-4000-8000-000000000082";
const ANNA = "00000000-0000-4000-8000-000000000083";
const BINH = "00000000-0000-4000-8000-000000000084";
const CHAU = "00000000-0000-4000-8000-000000000085";

const fill = (prompt: string) => ({
  id: "q-thanks",
  type: "fill",
  prompt,
  inputMode: "hiragana",
  kanjiStrict: false,
  answer: ["ありがとうございます"],
  explain: "Cảm ơn lịch sự.",
  points: 2,
  tags: [],
});
const choice = {
  id: "q-greet",
  type: "choice",
  prompt: "Chào buổi sáng?",
  options: ["おはよう", "こんばんは"],
  multiple: false,
  answer: [0],
  explain: "おはよう là chào buổi sáng.",
  points: 1,
  tags: [],
};
const content = (prompt: string) => ({
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  slides: [{ id: "intro", type: "title", jp: "あいさつ", vi: "Chào hỏi" }],
  questions: [fill(prompt), choice],
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
  for (const file of files.sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }
  for (const id of [TEACHER, OTHER_TEACHER, ANNA, BINH, CHAU]) {
    await db.query("insert into auth.users(id, email) values ($1, $2)", [id, `${id}@example.test`]);
  }
  await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
    TEACHER,
    OTHER_TEACHER,
  ]);
  await db.exec("set role service_role;");
  async function one<Row>(sql: string, params: unknown[] = []) {
    const result = await db.query<Row>(sql, params);
    assert.equal(result.rows.length, 1, sql);
    return result.rows[0];
  }
  return { db, one };
}

test("a teacher accepts an equivalent answer: scores, mistakes and later practice follow", async () => {
  const { db, one } = await openDatabase();
  const version = await one<{ id: string }>(
    "select public.publish_lesson('bank', $1, 0, 'Ôn', '', '', 1, 'n5', $2) as id",
    [TEACHER, content("Viết “cảm ơn” lịch sự.")],
  );
  const classRow = await one<{ id: string }>(
    "insert into public.classes(teacher_id, name, join_code) values ($1, 'N5', 'ABCDEFGH') returning id",
    [TEACHER],
  );
  for (const learner of [ANNA, BINH, CHAU]) {
    await db.query("select * from public.join_class($1, 'ABCDEFGH')", [learner]);
  }
  const pin = (versionId: string) =>
    db.query("select public.upsert_class_lesson($1, $2, 'bank', $3, 1, $4)", [
      TEACHER,
      classRow.id,
      versionId,
      new Date(Date.now() - 1000),
    ]);
  await pin(version.id);
  const publishPractice = async () =>
    (
      await one<{ id: string }>(
        "select public.publish_assignment($1, $2, 'bank', 'Luyện', 'practice', null, true, 70, 3, 'after_submit', $3, null) as id",
        [TEACHER, classRow.id, ["q-thanks", "q-greet"]],
      )
    ).id;
  const practice = await publishPractice();
  const submit = async (learner: string, thanks: string, greet: number[]) => {
    const started = await one<{ submission_id: string }>(
      "select * from public.start_attempt($1, $2)",
      [learner, practice],
    );
    const greetCorrect = greet[0] === 0;
    const results = [
      { question_id: "q-thanks", raw: thanks, is_correct: false, points_earned: 0 },
      {
        question_id: "q-greet",
        raw: greet,
        is_correct: greetCorrect,
        points_earned: greetCorrect ? 1 : 0,
      },
    ];
    await one(
      "select * from public.submit_attempt($1, $2, 0, '{}', $3, $4, 3, '{\"reps\":0}', 'ts-fsrs-5.4.2')",
      [learner, started.submission_id, JSON.stringify(results), greetCorrect ? 1 : 0],
    );
    return started.submission_id;
  };
  const anna = await submit(ANNA, "ありがとう", [0]);
  const binh = await submit(BINH, "ありがとう。", [1]);
  const chau = await submit(CHAU, "どうも", [0]);

  // Graded history stays immutable outside the regrade.
  await assert.rejects(
    db.query("update public.answers set is_correct = true where submission_id = $1", [anna]),
    /history_immutable/,
  );
  await assert.rejects(
    db.query("update public.submissions set score = 3 where id = $1", [anna]),
    /submission_immutable/,
  );
  await assert.rejects(
    db.query(
      "update public.assignment_items set question_snapshot = question_snapshot where assignment_id = $1",
      [practice],
    ),
    /assignment_immutable/,
  );

  const accept = (teacher: string, question: string, variant: string, ids: string[]) =>
    one<{ count: number }>("select public.accept_answer_variant($1, $2, $3, $4, $5) as count", [
      teacher,
      practice,
      question,
      variant,
      ids,
    ]);
  await assert.rejects(accept(OTHER_TEACHER, "q-thanks", "ありがとう", [anna]), /reng:not_found/);
  await assert.rejects(accept(TEACHER, "q-greet", "おはよう", [binh]), /reng:invalid_input/);
  // The server passes the submissions its grader now marks correct, here Anna's and Bình's.
  assert.equal((await accept(TEACHER, "q-thanks", " ありがとう ", [anna, binh])).count, 2);

  const answers = await db.query<{ submission_id: string; is_correct: boolean; points: number }>(
    "select submission_id, is_correct, points_earned as points from public.answers where question_id = 'q-thanks'",
  );
  const byId = new Map(answers.rows.map((row) => [row.submission_id, row]));
  assert.deepEqual(
    [anna, binh, chau].map((id) => [byId.get(id)?.is_correct, byId.get(id)?.points]),
    [
      [true, 2],
      [true, 2],
      [false, 0],
    ],
  );
  const scores = await db.query<{ id: string; score: number; passed: boolean; raw: unknown }>(
    "select s.id, s.score, s.passed from public.submissions s where s.assignment_id = $1",
    [practice],
  );
  const scoreOf = (id: string) => scores.rows.find((row) => row.id === id);
  assert.deepEqual([scoreOf(anna)?.score, scoreOf(anna)?.passed], [3, true]);
  assert.deepEqual([scoreOf(binh)?.score, scoreOf(binh)?.passed], [2, false]);
  assert.deepEqual([scoreOf(chau)?.score, scoreOf(chau)?.passed], [1, false]);
  const kept = await one<{ raw: unknown }>(
    "select raw from public.answers where submission_id = $1 and question_id = 'q-thanks'",
    [binh],
  );
  assert.equal(kept.raw, "ありがとう。", "what the learner wrote stays");

  const cards = await db.query<{ user_id: string; item_id: string; resolved: boolean }>(
    "select user_id, item_id, resolved_at is not null as resolved from public.srs_cards where item_type = 'mistake'",
  );
  const card = (user: string, item: string) =>
    cards.rows.find((row) => row.user_id === user && row.item_id === item)?.resolved;
  assert.equal(card(ANNA, "q-thanks"), true);
  assert.equal(card(BINH, "q-thanks"), true);
  assert.equal(card(BINH, "q-greet"), false, "other mistakes stay open");
  assert.equal(card(CHAU, "q-thanks"), false, "a different answer stays wrong");

  const snapshot = await one<{ answer: string[] }>(
    "select question_snapshot -> 'answer' as answer from public.assignment_items where assignment_id = $1 and question_id = 'q-thanks'",
    [practice],
  );
  assert.deepEqual(snapshot.answer, ["ありがとうございます", "ありがとう"]);
  assert.equal(
    (
      await one<{ count: number }>(
        "select count(*)::int as count from public.audit_events where action = 'answer.variant_accepted'",
      )
    ).count,
    1,
  );
  // The flag ends with the transaction that set it.
  await assert.rejects(
    db.query("update public.answers set is_correct = true where submission_id = $1", [chau]),
    /history_immutable/,
  );
  // Accepting again changes nothing and adds no duplicate.
  assert.equal((await accept(TEACHER, "q-thanks", "ありがとう", [anna, binh])).count, 0);
  assert.equal(
    (await one<{ count: number }>("select count(*)::int as count from public.answer_variants"))
      .count,
    1,
  );

  // Later practice from the lesson accepts the answer, unless the question was rewritten.
  const next = await publishPractice();
  const nextSnapshot = await one<{ answer: string[] }>(
    "select question_snapshot -> 'answer' as answer from public.assignment_items where assignment_id = $1 and question_id = 'q-thanks'",
    [next],
  );
  assert.deepEqual(nextSnapshot.answer, ["ありがとうございます", "ありがとう"]);
  const rewritten = await one<{ id: string }>(
    "select public.publish_lesson('bank', $1, 1, 'Ôn', '', '', 1, 'n5', $2) as id",
    [TEACHER, content("Viết “cảm ơn” với người lớn tuổi.")],
  );
  await pin(rewritten.id);
  const afterRewrite = await publishPractice();
  assert.deepEqual(
    (
      await one<{ answer: string[] }>(
        "select question_snapshot -> 'answer' as answer from public.assignment_items where assignment_id = $1 and question_id = 'q-thanks'",
        [afterRewrite],
      )
    ).answer,
    ["ありがとうございます"],
  );
});

test("accepting an answer in a private test regrades the test only", async () => {
  const { db, one } = await openDatabase();
  const version = await one<{ id: string }>(
    "select public.publish_lesson('bank', $1, 0, 'Ôn', '', '', 1, 'n5', $2) as id",
    [TEACHER, content("Viết “cảm ơn” lịch sự.")],
  );
  const classRow = await one<{ id: string }>(
    "insert into public.classes(teacher_id, name, join_code) values ($1, 'N5', 'ABCDEFGH') returning id",
    [TEACHER],
  );
  await db.query("select * from public.join_class($1, 'ABCDEFGH')", [ANNA]);
  await db.query("select public.upsert_class_lesson($1, $2, 'bank', $3, 1, $4)", [
    TEACHER,
    classRow.id,
    version.id,
    new Date(Date.now() - 1000),
  ]);
  const testQuestion = { ...fill("Viết “cảm ơn”."), id: "t1" };
  const exam = await one<{ id: string }>(
    "select public.publish_assignment($1, $2, 'bank', 'Kiểm tra', 'test', $3, false, 70, 1, 'after_submit', '{}', $4) as id",
    [TEACHER, classRow.id, new Date(Date.now() + 86_400_000), JSON.stringify([testQuestion])],
  );
  const started = await one<{ submission_id: string }>(
    "select * from public.start_attempt($1, $2)",
    [ANNA, exam.id],
  );
  await one(
    "select * from public.submit_attempt($1, $2, 0, '{}', $3, 0, 2, '{\"reps\":0}', 'ts-fsrs-5.4.2')",
    [
      ANNA,
      started.submission_id,
      JSON.stringify([
        { question_id: "t1", raw: "ありがとう", is_correct: false, points_earned: 0 },
      ]),
    ],
  );
  const regraded = await one<{ count: number }>(
    "select public.accept_answer_variant($1, $2, 't1', 'ありがとう', $3) as count",
    [TEACHER, exam.id, [started.submission_id]],
  );
  assert.equal(regraded.count, 1);
  assert.equal(
    (await one<{ count: number }>("select count(*)::int as count from public.answer_variants"))
      .count,
    0,
    "a private test question does not change later practice",
  );
});
