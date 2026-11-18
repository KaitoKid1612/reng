import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-0000000000d1";
const OTHER_TEACHER = "00000000-0000-4000-8000-0000000000d2";
const LEARNER = "00000000-0000-4000-8000-0000000000d3";
const SECOND = "00000000-0000-4000-8000-0000000000d4";
const OUTSIDER = "00000000-0000-4000-8000-0000000000d5";

const question = (id: string) => ({
  id,
  type: "choice",
  prompt: `{本|ほん}が あります。${id}`,
  options: ["が", "を", "に"],
  multiple: false,
  answer: [0],
  explain: "あります đi với が.",
  points: 1,
  tags: [],
});
const content = {
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  slides: [{ id: "s1", type: "title", jp: "第1課", vi: "Bài 1" }],
  questions: [question("q1"), question("q2")],
};
const snapshot = [
  { id: "q1", prompt: "q1", options: ["が", "を", "に"], answer: 0, explain: "" },
  { id: "q2", prompt: "q2", options: ["が", "を", "に"], answer: 2, explain: "" },
];

test("a live round runs only for the class owner and its members, with server-side timing", async () => {
  const db = new PGlite();
  async function one<Row>(sql: string, params: unknown[] = []) {
    const result = await db.query<Row>(sql, params);
    assert.equal(result.rows.length, 1, sql);
    return result.rows[0];
  }
  async function rejects(sql: string, params: unknown[], code: string) {
    await assert.rejects(db.query(sql, params), (error: Error) => error.message.includes(code));
  }
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
    const files = (await readdir("supabase/migrations")).filter((file) => file.endsWith(".sql"));
    for (const file of files.sort()) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    for (const [id, name] of [
      [TEACHER, "Cô Lan"],
      [OTHER_TEACHER, "Thầy Nam"],
      [LEARNER, "Bình"],
      [SECOND, "Chi"],
      [OUTSIDER, "Dũng"],
    ]) {
      await db.query(
        "insert into auth.users(id, email_confirmed_at, raw_user_meta_data) values ($1, now(), $2)",
        [id, { full_name: name }],
      );
    }
    await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
      TEACHER,
      OTHER_TEACHER,
    ]);

    // Learners cannot read or write the round, even its question keys.
    for (const table of ["live_quizzes", "live_quiz_players", "live_quiz_answers"]) {
      const grants = await one<{ n: number }>(
        "select count(*)::int as n from information_schema.role_table_grants where table_name = $1 and grantee in ('anon', 'authenticated')",
        [table],
      );
      assert.equal(grants.n, 0, table);
    }

    await db.exec("set role service_role");
    const version = await one<{ id: string }>(
      "select public.publish_lesson('lesson-01', $1, 0, 'Bài 1', '', '', 1, 'n5', $2) as id",
      [TEACHER, content],
    );
    const classRow = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'N5 Tối', 'ABCDEFGH') returning id",
      [TEACHER],
    );
    for (const user of [LEARNER, SECOND]) {
      await db.query("select * from public.join_class($1, 'ABCDEFGH')", [user]);
    }
    await db.query("select public.upsert_class_lesson($1, $2, 'lesson-01', $3, 1, now())", [
      TEACHER,
      classRow.id,
      version.id,
    ]);

    const create = "select public.create_live_quiz($1, $2, 'lesson-01', $3, $4, $5) as id";
    await rejects(create, [OTHER_TEACHER, classRow.id, version.id, snapshot, 20], "reng:not_found");
    await rejects(
      create,
      [TEACHER, classRow.id, version.id, snapshot, 300],
      "reng:invalid_request",
    );
    const first = await one<{ id: string }>(create, [
      TEACHER,
      classRow.id,
      version.id,
      snapshot,
      20,
    ]);
    // A second round finishes the first one: one open round per class.
    const quiz = await one<{ id: string }>(create, [
      TEACHER,
      classRow.id,
      version.id,
      snapshot,
      20,
    ]);
    assert.equal(
      (
        await one<{ phase: string }>("select phase from public.live_quizzes where id = $1", [
          first.id,
        ])
      ).phase,
      "finished",
    );

    // Members join; someone outside the class and the teacher do not.
    await db.query("select public.join_live_quiz($1, $2)", [LEARNER, quiz.id]);
    await db.query("select public.join_live_quiz($1, $2)", [LEARNER, quiz.id]);
    await db.query("select public.join_live_quiz($1, $2)", [SECOND, quiz.id]);
    await rejects("select public.join_live_quiz($1, $2)", [OUTSIDER, quiz.id], "reng:not_found");
    await rejects("select public.join_live_quiz($1, $2)", [TEACHER, quiz.id], "reng:not_found");

    // Nothing to answer in the lobby.
    const answer = "select * from public.submit_live_answer($1, $2, $3, $4)";
    await rejects(answer, [LEARNER, quiz.id, 0, 0], "reng:closed");

    const advance = "select public.advance_live_quiz($1, $2, $3, $4) as revision";
    const started = await one<{ revision: number }>(advance, [TEACHER, quiz.id, 0, "start"]);
    assert.equal(started.revision, 1);
    // A stale revision (double click, second tab) moves nothing.
    await rejects(advance, [TEACHER, quiz.id, 0, "start"], "reng:conflict");
    await rejects(advance, [OTHER_TEACHER, quiz.id, 1, "reveal"], "reng:not_found");

    const right = await one<{ is_correct: boolean; points: number }>(answer, [
      LEARNER,
      quiz.id,
      0,
      0,
    ]);
    assert.equal(right.is_correct, true);
    assert.ok(right.points > 900 && right.points <= 1000, `fast answer ${right.points}`);
    // The first answer stands.
    const again = await one<{ is_correct: boolean; points: number }>(answer, [
      LEARNER,
      quiz.id,
      0,
      1,
    ]);
    assert.deepEqual(again, right);
    await rejects(answer, [SECOND, quiz.id, 0, 7], "reng:invalid_answer");
    await rejects(answer, [SECOND, quiz.id, 1, 0], "reng:closed");
    await rejects(answer, [OUTSIDER, quiz.id, 0, 0], "reng:not_found");

    // Past the time limit (and its second of grace) the question is closed.
    await db.exec("reset role");
    await db.query(
      "update public.live_quizzes set question_started_at = now() - interval '22 seconds' where id = $1",
      [quiz.id],
    );
    await db.exec("set role service_role");
    await rejects(answer, [SECOND, quiz.id, 0, 0], "reng:closed");

    await db.query(advance, [TEACHER, quiz.id, 1, "reveal"]);
    await rejects(answer, [SECOND, quiz.id, 0, 0], "reng:closed");
    await db.query(advance, [TEACHER, quiz.id, 2, "next"]);
    const wrong = await one<{ is_correct: boolean; points: number }>(answer, [
      SECOND,
      quiz.id,
      1,
      0,
    ]);
    assert.deepEqual(wrong, { is_correct: false, points: 0 });
    await db.query(advance, [TEACHER, quiz.id, 3, "reveal"]);
    // "Next" after the last question ends the round.
    await db.query(advance, [TEACHER, quiz.id, 4, "next"]);
    const done = await one<{ phase: string; finished: boolean }>(
      "select phase, finished_at is not null as finished from public.live_quizzes where id = $1",
      [quiz.id],
    );
    assert.deepEqual(done, { phase: "finished", finished: true });
    await rejects(advance, [TEACHER, quiz.id, 5, "next"], "reng:invalid_state");
    await rejects("select public.join_live_quiz($1, $2)", [LEARNER, quiz.id], "reng:not_found");

    // A self-study class has no one to play against.
    const selfStudy = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code, join_enabled, self_study) values ($1, 'Tự học', 'HGFEDCBA', false, true) returning id",
      [TEACHER],
    );
    await rejects(create, [TEACHER, selfStudy.id, version.id, snapshot, 20], "reng:not_found");
  } finally {
    await db.close();
  }
});
