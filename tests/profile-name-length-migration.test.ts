import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const LEARNER = "00000000-0000-4000-8000-0000000000c1";
const GOOGLE_USER = "00000000-0000-4000-8000-0000000000c2";

test("a profile name stays within the sign-up limit, even when written through the Data API", async () => {
  const db = new PGlite();
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
    const files = (await readdir("supabase/migrations"))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of files) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.query("insert into auth.users(id, email, raw_user_meta_data) values ($1, $2, $3)", [
      LEARNER,
      "learner@reng.local",
      { full_name: "Hà" },
    ]);
    // A long name from Google still signs up: the trigger keeps its first 200 characters.
    await db.query("insert into auth.users(id, email, raw_user_meta_data) values ($1, $2, $3)", [
      GOOGLE_USER,
      "google@reng.local",
      { full_name: "N".repeat(300) },
    ]);
    const google = await db.query<{ length: number }>(
      "select char_length(full_name) as length from public.profiles where id = $1",
      [GOOGLE_USER],
    );
    assert.equal(google.rows[0]?.length, 200);

    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [LEARNER]);
    await db.exec("set role authenticated");
    await db.query("update public.profiles set full_name = $1 where id = $2", [
      "H".repeat(200),
      LEARNER,
    ]);
    await assert.rejects(
      db.query("update public.profiles set full_name = $1 where id = $2", [
        "H".repeat(201),
        LEARNER,
      ]),
      /profiles_full_name_length/,
    );
    await db.exec("reset role");
    const learner = await db.query<{ length: number }>(
      "select char_length(full_name) as length from public.profiles where id = $1",
      [LEARNER],
    );
    assert.equal(learner.rows[0]?.length, 200);
  } finally {
    await db.close();
  }
});
