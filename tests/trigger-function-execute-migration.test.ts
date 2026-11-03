import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const TEACHER = "00000000-0000-4000-8000-000000000091";

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

test("no trigger function can be called by anon or authenticated, and triggers still fire", async () => {
  const db = await openDatabase();
  const callable = await db.query<{ name: string }>(`
    select p.proname as name
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute'))
  `);
  assert.deepEqual(callable.rows, []);
  // RLS policies call these helpers as the signed-in user, so they keep their grant.
  const helpers = await db.query<{ allowed: boolean }>(`
    select has_function_privilege('authenticated', 'public.teaches_class(uuid)', 'execute')
      and has_function_privilege('authenticated', 'public.teaches_assignment(uuid)', 'execute')
      as allowed
  `);
  assert.equal(helpers.rows[0].allowed, true);

  // A new account still gets its profile, and a self-study class still enrolls its owner, even
  // though the role inserting the class can no longer execute the trigger function itself.
  await db.query("insert into auth.users(id, email_confirmed_at) values ($1, now())", [TEACHER]);
  const profile = await db.query("select 1 from public.profiles where id = $1", [TEACHER]);
  assert.equal(profile.rows.length, 1);
  await db.exec("set role service_role;");
  const created = await db.query<{ id: string }>(
    "insert into public.classes(teacher_id, name, join_code, self_study) values ($1, 'Tự học', 'ABCDEFGH', true) returning id",
    [TEACHER],
  );
  const enrolled = await db.query("select 1 from public.enrollments where class_id = $1", [
    created.rows[0].id,
  ]);
  assert.equal(enrolled.rows.length, 1);
});
