import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { buildFuriganaPatchSql, planFuriganaPatch } from "../lib/furigana-patch";

import type { SnapshotRow } from "../lib/furigana-patch";

const TEACHER = "00000000-0000-4000-8000-000000000081";
const ASSIGNMENT = "00000000-0000-4000-8000-000000000082";

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
const reading = {
  id: "q2",
  type: "fill",
  prompt: "Viết cách đọc bằng hiragana: 私",
  inputMode: "hiragana",
  kanjiStrict: false,
  answer: ["わたし"],
  explain: "私: tôi.",
  points: 1,
  tags: ["kanji"],
};
const withFurigana = {
  ...choice,
  prompt: "{昨日|きのう}、{学校|がっこう}へ（　）。",
  options: ["{行|い}きました", "{来|き}ました"],
  explain: "{行|い}きます: đi.",
};

const row = (snapshot: Record<string, unknown>): SnapshotRow => ({
  assignment_id: ASSIGNMENT,
  question_id: String(snapshot.id),
  question_snapshot: snapshot,
});

test("only furigana may change in a snapshot that was already given", () => {
  const before = [row(choice), row(reading)];
  assert.deepEqual(planFuriganaPatch(before, [row(withFurigana), row(reading)]), [
    { assignment_id: ASSIGNMENT, question_id: "q1", old: choice, snapshot: withFurigana },
  ]);
  // Key order is not a change.
  assert.deepEqual(planFuriganaPatch(before, [row({ ...choice }), row(reading)]), []);
  assert.throws(
    () => planFuriganaPatch(before, [row({ ...withFurigana, answer: [1] }), row(reading)]),
    /only furigana may change/,
  );
  assert.throws(
    () =>
      planFuriganaPatch(before, [
        row({ ...withFurigana, prompt: "{今日|きょう}、学校へ（　）。" }),
        row(reading),
      ]),
    /only furigana may change/,
  );
  assert.throws(
    () =>
      planFuriganaPatch(before, [
        row(choice),
        row({ ...reading, prompt: "Viết cách đọc bằng hiragana: {私|わたし}" }),
      ]),
    /q2: Furigana: câu luyện kanji/,
  );
  assert.throws(() => planFuriganaPatch(before, [row(withFurigana)]), /exactly the questions/);
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
  return db;
}

test("the patch SQL fixes a given assignment through the display-fix function", async () => {
  const db = await openDatabase();
  await db.query("insert into auth.users(id, email_confirmed_at) values ($1, now())", [TEACHER]);
  await db.query("update public.profiles set role = 'teacher' where id = $1", [TEACHER]);
  const content = {
    schemaVersion: 1,
    vocab: [],
    grammar: [],
    slides: [{ id: "intro", type: "title", jp: "第5課", vi: "Bài 5" }],
    questions: [choice, reading],
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
     values ($1, $2, 'minna-05', $3, 'Luyện tập hằng ngày', 'practice', now() + interval '1 day', 'after_submit')`,
    [ASSIGNMENT, classId, version],
  );
  for (const [index, question] of [choice, reading].entries()) {
    await db.query(
      "insert into public.assignment_items(assignment_id, question_id, position, question_snapshot) values ($1, $2, $3, $4)",
      [ASSIGNMENT, question.id, index + 1, question],
    );
  }
  await db.query(
    "update public.assignments set status = 'published', published_at = now() where id = $1",
    [ASSIGNMENT],
  );
  const snapshots = async () =>
    (
      await db.query<{ question_id: string; question_snapshot: Record<string, unknown> }>(
        "select question_id, question_snapshot from public.assignment_items where assignment_id = $1 order by position",
        [ASSIGNMENT],
      )
    ).rows;

  const changes = planFuriganaPatch([row(choice), row(reading)], [row(withFurigana), row(reading)]);
  await db.exec(buildFuriganaPatchSql(changes, false));
  assert.deepEqual((await snapshots())[0].question_snapshot, choice, "a dry run changes nothing");

  await db.exec(buildFuriganaPatchSql(changes, true));
  assert.deepEqual(
    (await snapshots()).map((item) => item.question_snapshot),
    [withFurigana, reading],
  );
  await assert.rejects(
    db.query(
      "update public.assignment_items set question_snapshot = $2 where assignment_id = $1 and question_id = 'q1'",
      [ASSIGNMENT, choice],
    ),
    /assignment_immutable/,
    "the guard is on again after the patch",
  );
  const edits = await db.query<{ editor_id: string; before_snapshot: unknown }>(
    "select editor_id, before_snapshot from public.assignment_item_edits where assignment_id = $1",
    [ASSIGNMENT],
  );
  assert.deepEqual(edits.rows, [{ editor_id: TEACHER, before_snapshot: choice }]);
  // Run again: the snapshot no longer matches the export, so nothing changes.
  await assert.rejects(
    db.exec(buildFuriganaPatchSql(changes, true)),
    /Furigana refused for q1: conflict/,
  );
  await db.exec("rollback");
  assert.deepEqual((await snapshots())[0].question_snapshot, withFurigana);
});
