import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const MIGRATION = "20261110112415_web_push.sql";
const LEARNER = "00000000-0000-4000-8000-0000000000d1";
const OTHER = "00000000-0000-4000-8000-0000000000d2";

test("push devices and logs are server-only and go with a deleted account", async () => {
  const db = new PGlite();
  const count = async (sql: string, params: unknown[] = []) =>
    (await db.query<{ n: number }>(`select count(*)::int as n from ${sql}`, params)).rows[0].n;
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
      .filter((file) => file.endsWith(".sql") && file <= MIGRATION)
      .sort();
    for (const file of files) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    for (const id of [LEARNER, OTHER]) {
      await db.query(
        "insert into auth.users(id, email, email_confirmed_at) values ($1, $2, now())",
        [id, `${id.slice(-2)}@example.test`],
      );
    }
    const device = (user: string, endpoint: string) =>
      db.query(
        "insert into public.push_subscriptions(user_id, endpoint, p256dh, auth) values ($1, $2, 'key', 'secret')",
        [user, endpoint],
      );
    await device(LEARNER, "https://push.example.test/a");
    await device(OTHER, "https://push.example.test/b");
    await assert.rejects(device(OTHER, "http://push.example.test/plain"), /check constraint/);
    await assert.rejects(device(OTHER, "https://push.example.test/a"), /duplicate key/);
    await db.query(
      "insert into public.push_log(user_id, kind, for_date) values ($1, 'daily_reminder', current_date)",
      [LEARNER],
    );
    await assert.rejects(
      db.query(
        "insert into public.push_log(user_id, kind, for_date) values ($1, 'daily_reminder', current_date)",
        [LEARNER],
      ),
      /duplicate key/,
      "one reminder a person a day",
    );

    // Neither the Data API nor a signed-in person reaches the tables.
    for (const role of ["anon", "authenticated"]) {
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [LEARNER]);
      await db.exec(`set role ${role}`);
      await assert.rejects(
        db.query("select * from public.push_subscriptions"),
        /permission denied/,
      );
      await assert.rejects(db.query("select * from public.push_log"), /permission denied/);
      await db.exec("reset role");
    }

    await db.exec("set role service_role");
    await db.query("select public.anonymize_learner($1)", [LEARNER]);
    await db.exec("reset role");
    assert.equal(await count("public.push_subscriptions where user_id = $1", [LEARNER]), 0);
    assert.equal(await count("public.push_log where user_id = $1", [LEARNER]), 0);
    assert.equal(await count("public.push_subscriptions where user_id = $1", [OTHER]), 1);
  } finally {
    await db.close();
  }
});
