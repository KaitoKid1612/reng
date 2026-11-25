import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

// Cards are made with the migrations from before the trigger, as production made them.
const BEFORE_TRIGGER = "20261125082709_delete_unlinked_history_on_account_deletion.sql";
const MIGRATION = "20261125093714_merge_existing_duplicate_mistakes.sql";
const TEACHER = "00000000-0000-4000-8000-0000000000f1";
const LEARNER = "00000000-0000-4000-8000-0000000000f2";

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

test("cards made before the trigger leave one open card per lesson and question, and every review stays", async () => {
  const db = new PGlite();
  async function one<Row>(sql: string, params: unknown[] = []) {
    const result = await db.query<Row>(sql, params);
    assert.equal(result.rows.length, 1, sql);
    return result.rows[0];
  }
  async function migrate(after: string, upTo: string) {
    const files = (await readdir("supabase/migrations"))
      .filter((file) => file.endsWith(".sql") && file > after && file <= upTo)
      .sort();
    for (const file of files) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
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
    await migrate("", BEFORE_TRIGGER);
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
    const bank = await one<{ id: string }>(
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
    for (const [lessonId, version, order] of [
      ["bank", bank.id, 1],
      ["other", other.id, 2],
    ] as const) {
      await db.query("select public.upsert_class_lesson($1, $2, $3, $4, $5, $6)", [
        TEACHER,
        classRow.id,
        lessonId,
        version,
        order,
        past,
      ]);
    }
    const practice = async (lessonId: string, title: string) =>
      (
        await one<{ id: string }>(
          "select public.publish_assignment($1, $2, $3, $4, 'practice', null, false, 70, 2, 'after_submit', $5, null) as id",
          [TEACHER, classRow.id, lessonId, title, ["q1", "q2"]],
        )
      ).id;
    const missQ1 = async (assignmentId: string) => {
      const started = await one<{ submission_id: string }>(
        "select * from public.start_attempt($1, $2)",
        [LEARNER, assignmentId],
      );
      await one(
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
    };
    const learned = await practice("bank", "Luyện tập hằng ngày 21/11");
    const open = await practice("bank", "Luyện tập hằng ngày 22/11");
    const older = await practice("bank", "Luyện tập hằng ngày 23/11");
    const unreviewed = await practice("bank", "Luyện tập hằng ngày 24/11");
    const otherLesson = await practice("other", "Bài khác");
    for (const id of [learned, open, older, unreviewed, otherLesson]) {
      await missQ1(id);
    }
    const due = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const exam = await one<{ id: string }>(
      "select public.publish_jlpt_mock_exam($1, $2, 'bank', 'Thi thử', 'N5', $3, 90, 'after_due', $4) as id",
      [TEACHER, classRow.id, due, ["q1", "q2"]],
    );
    await missQ1(exam.id);
    await db.exec("reset role");

    // The 21/11 card was learned long ago, 23/11 reviewed once, 24/11 never; 22/11 changed last.
    const setCard = (source: string, resolved: boolean, daysAgo: number) =>
      db.query(
        `update public.srs_cards set resolved_at = case when $2 then now() - interval '5 days' end,
           correct_streak = case when $2 then 3 else 0 end,
           updated_at = now() - make_interval(days => $3)
         where user_id = $4 and item_type = 'mistake' and source_id = $1 and item_id = 'q1'`,
        [source, resolved, daysAgo, LEARNER],
      );
    await setCard(learned, true, 5);
    await setCard(open, false, 1);
    await setCard(older, false, 2);
    await setCard(unreviewed, false, 3);
    const review = (source: string) =>
      db.query(
        `insert into public.review_events(user_id, item_type, source_id, item_id, rating, is_correct, request_id)
         values ($1, 'mistake', $2, 'q1', 3, true, gen_random_uuid())`,
        [LEARNER, source],
      );
    for (const source of [learned, learned, learned, older, open]) {
      await review(source);
    }

    await migrate(BEFORE_TRIGGER, MIGRATION);

    const cards = await db.query<{ source_id: string; open: boolean }>(
      `select source_id, resolved_at is null as open from public.srs_cards
       where user_id = $1 and item_type = 'mistake' and item_id = 'q1'`,
      [LEARNER],
    );
    const bySource = new Map(cards.rows.map((row) => [row.source_id, row.open]));
    // Of the bank's four cards only the one changed last stays open; the unreviewed one is gone and
    // the reviewed ones are done. Another lesson and an exam whose results are not out yet keep
    // their own open cards.
    assert.deepEqual(
      Object.fromEntries(bySource),
      Object.fromEntries([
        [open, true],
        [learned, false],
        [older, false],
        [otherLesson, true],
        [exam.id, true],
      ]),
    );
    const reviews = await db.query<{ count: number }>(
      "select count(*)::int as count from public.review_events where user_id = $1",
      [LEARNER],
    );
    assert.equal(reviews.rows[0].count, 5);
  } finally {
    await db.close();
  }
});
