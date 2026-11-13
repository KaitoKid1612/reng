import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { lessonDraftSchema } from "../lib/lesson-schema";
import { buildBankPublishSql } from "../lib/review-bank-sql";

const TEACHER = "00000000-0000-4000-8000-000000000071";
const OTHER_TEACHER = "00000000-0000-4000-8000-000000000072";

const bank = lessonDraftSchema.parse({
  id: "n5-test-review-bank",
  title: "Ôn Minna – thử",
  titleJa: "復習",
  summary: "Ngân hàng thử.",
  order: 1,
  courseId: "n5",
  isSample: false,
  content: {
    schemaVersion: 1,
    vocab: [],
    grammar: [],
    slides: [{ id: "intro", type: "title", jp: "復習", vi: "Ôn tập" }],
    questions: ["q1", "q2"].map((id) => ({
      id,
      type: "choice",
      prompt: `いすが 8（　　）あります。${id}`,
      options: ["つ", "にん"],
      multiple: false,
      answer: [0],
      explain: "Đồ vật đếm bằng 〜つ.",
      points: 1,
      tags: ["minna-11"],
    })),
  },
});

async function createDatabase() {
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
  await db.query("insert into auth.users(id, email_confirmed_at) values ($1, now()), ($2, now())", [
    TEACHER,
    OTHER_TEACHER,
  ]);
  await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
    TEACHER,
    OTHER_TEACHER,
  ]);
  await db.exec("set role service_role");
  return db;
}

test("bank:sql creates a missing bank for a class, adds it and makes it the daily source", async () => {
  const db = await createDatabase();
  try {
    const classRow = await db.query<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code, pass_score) values ($1, 'Minna', 'ABCDEFGH', 80) returning id",
      [TEACHER],
    );
    const classId = classRow.rows[0].id;
    await db.query("select public.set_daily_practice($1, $2, 60, null, 0, 'balanced')", [
      TEACHER,
      classId,
    ]);
    const options = { lessonId: bank.id, bank, audio: [], commit: true, classId };
    // Without the class a missing bank is refused, and the transaction leaves nothing behind.
    await assert.rejects(
      db.exec(buildBankPublishSql({ ...options, classId: undefined })),
      /does not exist; publish it once from the app first, or pass --class/,
    );
    await db.exec("rollback");
    await db.exec(buildBankPublishSql({ ...options, dailySource: true }));
    const state = await db.query<{
      owner_id: string;
      version_no: number;
      in_class: boolean;
      daily: string;
      size: number;
      listening: number;
    }>(
      `select l.owner_id, v.version_no,
         exists (select 1 from public.class_lessons cl where cl.class_id = $2 and cl.lesson_id = l.id
           and cl.lesson_version_id = l.published_version_id) as in_class,
         c.daily_practice_lesson_id as daily, c.daily_practice_size as size,
         c.daily_listening_count as listening
       from public.lessons l join public.lesson_versions v on v.id = l.published_version_id
       join public.classes c on c.id = $2 where l.id = $1`,
      [bank.id, classId],
    );
    assert.deepEqual(state.rows[0], {
      owner_id: TEACHER,
      version_no: 1,
      in_class: true,
      daily: bank.id,
      size: 60,
      listening: 0,
    });
    // Running the same file again publishes nothing new and keeps the class as it is.
    await db.exec(buildBankPublishSql({ ...options, dailySource: true }));
    const versions = await db.query<{ count: number }>(
      "select count(*)::int as count from public.lesson_versions where lesson_id = $1",
      [bank.id],
    );
    assert.equal(versions.rows[0].count, 1);
    // A class of another teacher cannot receive the bank.
    const other = await db.query<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code, pass_score) values ($1, 'Khác', 'HGFEDCBA', 80) returning id",
      [OTHER_TEACHER],
    );
    await assert.rejects(
      db.exec(buildBankPublishSql({ ...options, classId: other.rows[0].id })),
      /does not belong to the bank owner/,
    );
  } finally {
    await db.close();
  }
});

test("bank:sql refuses a daily source without a class and a bad lesson ID", () => {
  assert.throws(
    () =>
      buildBankPublishSql({ lessonId: bank.id, bank, audio: [], commit: false, dailySource: true }),
    /needs the class/,
  );
  assert.throws(
    () => buildBankPublishSql({ lessonId: "Bad ID", bank, audio: [], commit: false }),
    /lesson ID/,
  );
});
