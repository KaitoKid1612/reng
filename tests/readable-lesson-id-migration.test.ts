import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-000000000071";

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
  await db.query("insert into auth.users(id, email_confirmed_at) values ($1, now())", [TEACHER]);
  await db.query("update public.profiles set role = 'teacher' where id = $1", [TEACHER]);
  await db.exec("set role service_role");
  return db;
}

const EMPTY = { schemaVersion: 1, vocab: [], grammar: [], slides: [], questions: [] };

test("lessons made from a starter or a copy get a readable ID, and a retry returns the same one", async () => {
  const db = await openDatabase();
  const copy = (requestId: string, course: string, order: number) =>
    db.query<{ id: string }>(
      `select public.insert_lesson_copy($1, $2, 'starter:minna-1-18', 'Bài 18', '', '', $3, $4,
         $5::jsonb, '{}'::jsonb, null, null) as id`,
      [TEACHER, requestId, order, course, JSON.stringify(EMPTY)],
    );
  const first = (await copy("00000000-0000-4000-8000-0000000000a1", "minna-1", 18)).rows[0].id;
  assert.match(first, /^minna-1-18-[0-9a-f]{6}$/);
  const retry = (await copy("00000000-0000-4000-8000-0000000000a1", "minna-1", 18)).rows[0].id;
  assert.equal(retry, first);
  const second = (await copy("00000000-0000-4000-8000-0000000000a2", "minna-1", 18)).rows[0].id;
  assert.match(second, /^minna-1-18-[0-9a-f]{6}$/);
  assert.notEqual(second, first);
  const odd = (await copy("00000000-0000-4000-8000-0000000000a3", "N4 Tips!", 0)).rows[0].id;
  assert.match(odd, /^n4-tips-1-[0-9a-f]{6}$/);

  const teaching = await db.query<{ id: string }>(
    `select public.create_teaching_lesson($1, $2, 'Chào hỏi', 3, '{"schemaVersion":2}'::jsonb, '{}'::jsonb) as id`,
    [TEACHER, "00000000-0000-4000-8000-0000000000b1"],
  );
  assert.match(teaching.rows[0].id, /^chinese-3-[0-9a-f]{6}$/);
  await db.close();
});
