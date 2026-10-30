import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { endOfVietnamDay, toVietnamDate } from "../lib/daily-practice";

const TEACHER = "00000000-0000-4000-8000-000000000061";
const OTHER_TEACHER = "00000000-0000-4000-8000-000000000062";
const STUDENT = "00000000-0000-4000-8000-000000000063";

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
  questions: [choice("q1"), choice("q2"), choice("q3")],
};

test("daily practice publishes one assignment per class and Vietnam day, only when enabled", async () => {
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
    await db.query(
      "insert into auth.users(id, email_confirmed_at) values ($1, now()), ($2, now()), ($3, now())",
      [TEACHER, OTHER_TEACHER, STUDENT],
    );
    await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
      TEACHER,
      OTHER_TEACHER,
    ]);
    await db.exec("set role service_role");
    const version = await one<{ id: string }>(
      "select public.publish_lesson('minna-11', $1, 0, 'Bài 11', '第11課', 'Đếm', 11, 'minna-1', $2) as id",
      [TEACHER, lessonContent],
    );
    const classRow = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code, pass_score) values ($1, 'Minna tối', 'ABCDEFGH', 80) returning id",
      [TEACHER],
    );
    await db.query(
      "select public.upsert_class_lesson($1, $2, 'minna-11', $3, 1, now() - interval '1 minute')",
      [TEACHER, classRow.id, version.id],
    );
    const tomorrow = toVietnamDate(new Date(Date.now() + 86_400_000));
    const dayAfter = toVietnamDate(new Date(Date.now() + 2 * 86_400_000));
    const publish = (date: string, ids: string[]) =>
      one<{ id: string }>(
        "select public.publish_daily_practice($1, $2, 'minna-11', $3, $4) as id",
        [classRow.id, date, ids, endOfVietnamDay(date)],
      );

    await assert.rejects(publish(tomorrow, ["q1"]), /reng:class_not_found/, "off by default");
    await assert.rejects(
      db.query("select public.set_daily_practice($1, $2, 5)", [OTHER_TEACHER, classRow.id]),
      /reng:class_not_found/,
    );
    await assert.rejects(
      db.query("select public.set_daily_practice($1, $2, 2)", [TEACHER, classRow.id]),
      /reng:invalid_input/,
    );
    // The pilot keeps a 60-question daily set; anything larger is refused.
    await db.query("select public.set_daily_practice($1, $2, 60)", [TEACHER, classRow.id]);
    await assert.rejects(
      db.query("select public.set_daily_practice($1, $2, 61)", [TEACHER, classRow.id]),
      /reng:invalid_input/,
    );
    await db.query("select public.set_daily_practice($1, $2, 5)", [TEACHER, classRow.id]);

    const first = await publish(tomorrow, ["q2", "q1"]);
    const assignment = await one<{
      title: string;
      mode: string;
      allow_late: boolean;
      max_attempts: number;
      pass_score: number;
      status: string;
    }>(
      "select title, mode, allow_late, max_attempts, pass_score, status from public.assignments where id = $1",
      [first.id],
    );
    assert.equal(
      assignment.title,
      `Luyện tập hằng ngày ${tomorrow.slice(8, 10)}/${tomorrow.slice(5, 7)}`,
    );
    assert.deepEqual(
      { ...assignment, title: undefined },
      {
        title: undefined,
        mode: "practice",
        allow_late: true,
        max_attempts: 3,
        pass_score: 80,
        status: "published",
      },
    );
    const items = await db.query<{ question_id: string }>(
      "select question_id from public.assignment_items where assignment_id = $1 order by position",
      [first.id],
    );
    assert.deepEqual(
      items.rows.map((item) => item.question_id),
      ["q2", "q1"],
    );
    const retry = await publish(tomorrow, ["q3"]);
    assert.equal(retry.id, first.id, "a second run for the same day returns the first assignment");
    const next = await publish(dayAfter, ["q3"]);
    assert.notEqual(next.id, first.id);
    await assert.rejects(
      publish(toVietnamDate(new Date(Date.now() + 3 * 86_400_000)), ["nope"]),
      /reng:invalid_items/,
    );
    assert.equal(
      (
        await one<{ count: number }>(
          "select count(*)::int as count from public.daily_practice_runs",
        )
      ).count,
      2,
    );

    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [STUDENT]);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select * from public.daily_practice_runs"), /permission denied/);
    await assert.rejects(publish(dayAfter, ["q1"]), /permission denied/);
  } finally {
    await db.close();
  }
});
