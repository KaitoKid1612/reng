import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-000000000081";

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
  const created = await db.query<{ id: string }>(
    "insert into public.classes(teacher_id, name, join_code) values ($1, 'Minna tối', 'ABCDEFGH') returning id",
    [TEACHER],
  );
  return { db, classId: created.rows[0].id };
}

const slots = JSON.stringify([{ weekday: 2, start: "19:30", minutes: 90 }]);

test("the server keeps one bounded timetable per class", async () => {
  const { db, classId } = await openDatabase();
  await db.exec("set role service_role;");
  await db.query(
    "insert into public.class_schedules(class_id, slots, note) values ($1, $2, 'Nghỉ 20/11')",
    [classId, slots],
  );
  await db.query(
    `insert into public.class_schedules(class_id, slots, note) values ($1, '[]', '')
     on conflict (class_id) do update set slots = excluded.slots, note = excluded.note`,
    [classId],
  );
  const row = await db.query<{ slots: unknown; note: string }>(
    "select slots, note from public.class_schedules where class_id = $1",
    [classId],
  );
  assert.deepEqual(row.rows[0], { slots: [], note: "" });

  for (const [value, note] of [
    ['{"weekday": 2}', ""],
    [JSON.stringify(Array(15).fill({ weekday: 2, start: "19:30", minutes: 90 })), ""],
    ["[]", "x".repeat(301)],
  ]) {
    await assert.rejects(
      db.query("update public.class_schedules set slots = $2, note = $3 where class_id = $1", [
        classId,
        value,
        note,
      ]),
    );
  }
  await assert.rejects(
    db.query(
      "insert into public.class_schedules(class_id) values ('00000000-0000-4000-8000-000000000099')",
    ),
  );
});

test("browsers cannot read or write timetables directly", async () => {
  const { db, classId } = await openDatabase();
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`reset role; set role ${role};`);
    await assert.rejects(db.query("select * from public.class_schedules"));
    await assert.rejects(
      db.query("insert into public.class_schedules(class_id, slots) values ($1, $2)", [
        classId,
        slots,
      ]),
    );
  }
});
