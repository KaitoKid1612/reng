import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const MIGRATION = "20261110111047_learner_account_deletion.sql";
const TEACHER = "00000000-0000-4000-8000-0000000000c1";
const LEARNER = "00000000-0000-4000-8000-0000000000c2";
const OTHER = "00000000-0000-4000-8000-0000000000c3";
const APPLICANT = "00000000-0000-4000-8000-0000000000c4";
const FORMER_TEACHER = "00000000-0000-4000-8000-0000000000c5";
const ADMIN = "00000000-0000-4000-8000-0000000000c6";

const content = {
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  slides: [{ id: "s1", type: "title", jp: "第1課", vi: "Bài 1" }],
  questions: [
    {
      id: "q1",
      type: "choice",
      prompt: "Chọn đáp án.",
      options: ["A", "B"],
      answer: [0],
      multiple: false,
      points: 1,
      tags: [],
      explain: "A đúng.",
    },
  ],
};

test("a learner's account is anonymized: identity goes, class history stays", async () => {
  const db = new PGlite();
  async function one<Row>(sql: string, params: unknown[] = []) {
    const result = await db.query<Row>(sql, params);
    assert.equal(result.rows.length, 1, sql);
    return result.rows[0];
  }
  const count = async (sql: string, params: unknown[] = []) =>
    (await one<{ n: number }>(`select count(*)::int as n from ${sql}`, params)).n;
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
    for (const [id, name] of [
      [TEACHER, "Cô Lan"],
      [LEARNER, "Nguyễn Văn Bình"],
      [OTHER, "Lê Thu Hà"],
      [APPLICANT, "Trần An"],
      [FORMER_TEACHER, "Phạm Minh"],
      [ADMIN, "Quản trị"],
    ]) {
      await db.query(
        "insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data) values ($1, $2, now(), $3)",
        [id, `${id.slice(-2)}@example.test`, { full_name: name }],
      );
    }
    await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
      TEACHER,
      FORMER_TEACHER,
    ]);
    await db.query("insert into public.platform_admins(user_id) values ($1)", [ADMIN]);
    await db.query("insert into public.teacher_accounts(user_id, status) values ($1, 'pending')", [
      APPLICANT,
    ]);

    await db.exec("set role service_role");
    const version = await one<{ id: string }>(
      "select public.publish_lesson('lesson-01', $1, 0, 'Bài 1', '', '', 1, 'n5', $2) as id",
      [TEACHER, content],
    );
    await db.query(
      "select public.publish_lesson('former-lesson', $1, 0, 'Bài cũ', '', '', 1, 'n5', $2)",
      [FORMER_TEACHER, content],
    );
    const classRow = await one<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'N5 Tối', 'ABCDEFGH') returning id",
      [TEACHER],
    );
    for (const user of [LEARNER, OTHER]) {
      await db.query("select * from public.join_class($1, 'ABCDEFGH')", [user]);
    }
    await db.query("select public.upsert_class_lesson($1, $2, 'lesson-01', $3, 1, $4)", [
      TEACHER,
      classRow.id,
      version.id,
      new Date(Date.now() - 1000),
    ]);
    const assignment = await one<{ id: string }>(
      "select public.publish_assignment($1, $2, 'lesson-01', 'Luyện', 'practice', null, false, 70, 2, 'after_submit', $3, null) as id",
      [TEACHER, classRow.id, ["q1"]],
    );
    for (const user of [LEARNER, OTHER]) {
      const started = await one<{ submission_id: string }>(
        "select * from public.start_attempt($1, $2)",
        [user, assignment.id],
      );
      const submitted = await one<{ status: string }>(
        "select * from public.submit_attempt($1, $2, 0, '{}', $3, 1, 1, '{}', 'ts-fsrs-5.4.2')",
        [
          user,
          started.submission_id,
          JSON.stringify([{ question_id: "q1", raw: [0], is_correct: true, points_earned: 1 }]),
        ],
      );
      assert.equal(submitted.status, "submitted");
    }
    await db.exec("reset role");
    // Personal records the deletion removes.
    await db.query(
      "insert into public.notification_preferences(user_id, reminder_frequency) values ($1, 'daily')",
      [LEARNER],
    );
    await db.query(
      "insert into public.email_log(user_id, email_type, for_date, idempotency_key) values ($1, 'daily_reminder', current_date, 'k1')",
      [LEARNER],
    );
    await db.query("insert into public.join_attempts(user_id, succeeded) values ($1, true)", [
      LEARNER,
    ]);
    await db.query(
      `insert into public.learning_history_archives(source_key, learner_id, learner_email, teacher_id,
        learner_name, course, session_count, answer_count, payload)
       values ('sheet:1', $1, 'c2@example.test', $2, 'Nguyễn Văn Bình', 'N5', 1, 1, '{}')`,
      [LEARNER, TEACHER],
    );

    await db.exec("set role service_role");
    const refused = async (user: string) =>
      db.query("select public.anonymize_learner($1)", [user]).then(
        () => "done",
        (error: Error) => error.message,
      );
    assert.equal(await refused(TEACHER), "reng:teaching_account");
    assert.equal(await refused(ADMIN), "reng:teaching_account");
    await db.exec("reset role");
    // A paused teacher keeps their lessons, so the account still needs an operator.
    await db.query("update public.profiles set role = 'student' where id = $1", [FORMER_TEACHER]);
    await db.exec("set role service_role");
    assert.equal(await refused(FORMER_TEACHER), "reng:teaching_account");
    assert.equal(await refused("00000000-0000-4000-8000-0000000000ff"), "reng:not_found");

    await db.query("select public.anonymize_learner($1)", [LEARNER]);
    await db.query("select public.anonymize_learner($1)", [APPLICANT]);
    // A retry after a failed auth step changes nothing.
    await db.query("select public.anonymize_learner($1)", [LEARNER]);

    const profile = await one<{ full_name: string; deleted: boolean; role: string }>(
      "select full_name, deleted_at is not null as deleted, role from public.profiles where id = $1",
      [LEARNER],
    );
    assert.deepEqual(profile, { full_name: "Học viên đã xóa", deleted: true, role: "student" });
    for (const table of [
      "public.notification_preferences where user_id = $1",
      "public.email_log where user_id = $1",
      "public.join_attempts where user_id = $1",
      "public.learning_history_archives where learner_id = $1",
      "public.enrollments where user_id = $1 and left_at is null",
    ]) {
      assert.equal(await count(table, [LEARNER]), 0, table);
    }
    assert.equal(await count("public.teacher_accounts where user_id = $1", [APPLICANT]), 0);
    assert.equal(
      await count("public.audit_events where actor_id = $1 and action = 'account.anonymized'", [
        LEARNER,
      ]),
      1,
    );
    // The history stays and still counts for the class.
    assert.equal(await count("public.submissions where user_id = $1", [LEARNER]), 1);
    assert.equal(
      await count(
        "public.answers a join public.submissions s on s.id = a.submission_id where s.user_id = $1",
        [LEARNER],
      ),
      1,
    );
    const roster = await db.query<{ full_name: string; email: string; left: boolean }>(
      "select full_name, email, left_at is not null as left from public.class_roster($1) order by full_name",
      [classRow.id],
    );
    assert.deepEqual(roster.rows, [
      { full_name: "Học viên đã xóa", email: "", left: true },
      { full_name: "Lê Thu Hà", email: "c3@example.test", left: false },
    ]);
    // Other people are untouched.
    assert.equal(
      (
        await one<{ deleted: boolean }>(
          "select deleted_at is not null as deleted from public.profiles where id = $1",
          [OTHER],
        )
      ).deleted,
      false,
    );

    // Only the server may run it.
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [OTHER]);
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select public.anonymize_learner($1)", [OTHER]),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
