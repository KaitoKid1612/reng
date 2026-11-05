import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-000000000091";
const OTHER_TEACHER = "00000000-0000-4000-8000-000000000092";
const LEARNER = "00000000-0000-4000-8000-000000000093";
const ASSIGNMENT = "00000000-0000-4000-8000-000000000094";

const choice = {
  id: "q1",
  type: "choice",
  prompt: "昨日、学校へ（　）。",
  options: ["行きました", "来ました"],
  multiple: false,
  answer: [0],
  explain: "行きます: đi.",
  points: 1,
  tags: [],
};
const fill = {
  id: "q9",
  type: "fill",
  prompt: "「雑誌が 一冊 あります。」一冊の読みをひらがなで書く。",
  inputMode: "hiragana",
  kanjiStrict: false,
  answer: ["いっさつ"],
  explain: "一冊: một quyển.",
  points: 1,
  tags: ["kanji"],
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

test("teachers fix how a given question reads, never what is graded, with history", async () => {
  const db = await openDatabase();
  const content = {
    schemaVersion: 1,
    vocab: [],
    grammar: [],
    slides: [{ id: "intro", type: "title", jp: "第5課", vi: "Bài 5" }],
    questions: [choice, fill],
  };
  const version = (
    await db.query<{ id: string }>(
      "select public.publish_lesson('minna-05', $1, 0, 'Bài 5', '第5課', 'Đi lại', 5, 'minna-1', $2) as id",
      [TEACHER, content],
    )
  ).rows[0].id;
  const classId = (
    await db.query<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'N5', 'ABCDEFGH') returning id",
      [TEACHER],
    )
  ).rows[0].id;
  await db.query("select public.upsert_class_lesson($1, $2, 'minna-05', $3, 1, now())", [
    TEACHER,
    classId,
    version,
  ]);
  await db.query(
    `insert into public.assignments(id, class_id, lesson_id, lesson_version_id, title, mode, due_at, feedback_policy)
     values ($1, $2, 'minna-05', $3, 'Luyện tập hằng ngày 05/11', 'practice', now() + interval '1 day', 'after_submit')`,
    [ASSIGNMENT, classId, version],
  );
  for (const [index, question] of [choice, fill].entries()) {
    await db.query(
      "insert into public.assignment_items(assignment_id, question_id, position, question_snapshot) values ($1, $2, $3, $4)",
      [ASSIGNMENT, question.id, index + 1, question],
    );
  }
  await db.query(
    "update public.assignments set status = 'published', published_at = now() where id = $1",
    [ASSIGNMENT],
  );
  // The learner is half way through: the fix must leave the saved answers alone.
  const draft = { answers: { q1: [0], q9: "いっさつ" }, checked: [] };
  await db.query(
    "insert into public.submissions(assignment_id, user_id, attempt_no, draft_answers, draft_revision) values ($1, $2, 1, $3, 4)",
    [ASSIGNMENT, LEARNER, draft],
  );
  await db.exec("set role service_role");

  const fix = async (teacher: string, questionId: string, expected: unknown, next: unknown) =>
    (
      await db.query<{ status: string }>(
        "select public.fix_assignment_question($1, $2, $3, $4, $5) as status",
        [teacher, ASSIGNMENT, questionId, expected, next],
      )
    ).rows[0].status;
  const snapshot = async (questionId: string) =>
    (
      await db.query<{ question_snapshot: Record<string, unknown> }>(
        "select question_snapshot from public.assignment_items where assignment_id = $1 and question_id = $2",
        [ASSIGNMENT, questionId],
      )
    ).rows[0].question_snapshot;

  const rewritten = {
    ...fill,
    prompt: "「ざっしが 一冊 あります。」 Viết cách đọc Hiragana của 一冊.",
  };
  assert.equal(await fix(OTHER_TEACHER, "q9", fill, rewritten), "not_found");
  assert.equal(await fix(TEACHER, "q9", { ...fill, prompt: "cũ" }, rewritten), "conflict");
  assert.equal(
    await fix(TEACHER, "q9", fill, { ...rewritten, answer: ["いっさつ", "ざっし"] }),
    "invalid_change",
  );
  assert.equal(await fix(TEACHER, "q9", fill, { ...rewritten, points: 2 }), "invalid_change");
  assert.equal(await fix(TEACHER, "q9", fill, fill), "unchanged");
  assert.equal(await fix(TEACHER, "q9", fill, rewritten), "fixed");
  assert.deepEqual(await snapshot("q9"), rewritten);

  assert.equal(
    await fix(TEACHER, "q1", choice, { ...choice, options: ["行きます", "来ました"] }),
    "invalid_change",
    "an option's wording is what the learner chose",
  );
  const furigana = {
    ...choice,
    prompt: "{昨日|きのう}、{学校|がっこう}へ（　）。",
    options: ["{行|い}きました", "{来|き}ました"],
  };
  assert.equal(await fix(TEACHER, "q1", choice, furigana), "fixed");
  assert.deepEqual(await snapshot("q1"), furigana);

  const history = await db.query<{ question_id: string; editor_id: string; before_prompt: string }>(
    `select question_id, editor_id, before_snapshot ->> 'prompt' as before_prompt
     from public.assignment_item_edits where assignment_id = $1 order by created_at, question_id`,
    [ASSIGNMENT],
  );
  assert.deepEqual(
    history.rows.map((row) => [row.question_id, row.editor_id, row.before_prompt]).sort(),
    [
      ["q1", TEACHER, choice.prompt],
      ["q9", TEACHER, fill.prompt],
    ],
  );
  const audits = await db.query<{ count: number }>(
    "select count(*)::int as count from public.audit_events where action = 'assignment.question_fixed'",
  );
  assert.equal(audits.rows[0].count, 2);
  const saved = await db.query<{ draft_answers: unknown; draft_revision: number }>(
    "select draft_answers, draft_revision from public.submissions where assignment_id = $1",
    [ASSIGNMENT],
  );
  assert.deepEqual(saved.rows, [{ draft_answers: draft, draft_revision: 4 }]);

  // The guard still refuses direct edits, and the display flag alone cannot change an answer.
  await assert.rejects(
    db.query(
      "update public.assignment_items set question_snapshot = $2 where assignment_id = $1 and question_id = 'q9'",
      [ASSIGNMENT, fill],
    ),
    /assignment_immutable/,
  );
  await db.exec("set reng.display_fix = 'on'");
  await assert.rejects(
    db.query(
      "update public.assignment_items set question_snapshot = $2 where assignment_id = $1 and question_id = 'q9'",
      [ASSIGNMENT, { ...rewritten, answer: ["ざっし"] }],
    ),
    /assignment_immutable/,
  );
  await db.exec("reset reng.display_fix; reset role; set role authenticated;");
  await assert.rejects(
    db.query("select public.fix_assignment_question($1, $2, 'q9', $3, $3)", [
      TEACHER,
      ASSIGNMENT,
      rewritten,
    ]),
    /permission/,
  );
});
