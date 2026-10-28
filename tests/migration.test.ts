import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

test("applies grants, RLS, role protection and version immutability on embedded PostgreSQL", async () => {
  const db = new PGlite();
  const teacher = "00000000-0000-4000-8000-000000000001";
  const student = "00000000-0000-4000-8000-000000000002";
  const version = "00000000-0000-4000-8000-000000000003";
  async function asUser(id: string) {
    await db.exec("reset role;");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    await db.exec("set role authenticated;");
  }
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
    `);
    await db.exec(await readFile("supabase/migrations/202610280001_foundation.sql", "utf8"));
    await db.query("insert into auth.users(id, raw_user_meta_data) values ($1, $3), ($2, $3)", [
      teacher,
      student,
      { role: "teacher", full_name: "Học viên kiểm thử" },
    ]);
    const profile = await db.query<{ role: string }>(
      "select role from public.profiles where id = $1",
      [student],
    );
    assert.equal(profile.rows[0].role, "student", "user metadata must not grant the teacher role");
    await db.query("update public.profiles set role = 'teacher' where id = $1", [teacher]);
    await asUser(teacher);
    await db.query(
      "insert into public.lessons(id, owner_id, order_no, title) values ('bai-01', $1, 1, 'Bài 1')",
      [teacher],
    );
    await assert.rejects(
      db.query(
        "insert into public.lessons(id, owner_id, order_no, title) values ('fake', $1, 2, 'Sai chủ sở hữu')",
        [student],
      ),
    );
    await assert.rejects(
      db.query("update public.lessons set published_version_id = $1 where id = 'bai-01'", [
        version,
      ]),
    );
    await assert.rejects(
      db.exec(
        "insert into public.lesson_versions(lesson_id, version_no, title, content) values ('bai-01', 1, 'Bài 1', '{}')",
      ),
    );
    await asUser(student);
    assert.equal((await db.query("select * from public.lessons")).rows.length, 0);
    assert.equal((await db.query("select * from public.profiles")).rows.length, 1);
    await db.exec("update public.profiles set full_name = 'Tên mới' where id = auth.uid()");
    await assert.rejects(
      db.exec("update public.profiles set role = 'teacher' where id = auth.uid()"),
    );
    await assert.rejects(db.exec("select * from public.audio_assets"));
    await assert.rejects(
      db.query(
        "insert into public.lessons(id, owner_id, order_no, title) values ('student-lesson', $1, 3, 'Không được')",
        [student],
      ),
    );
    await db.exec("reset role; set role anon;");
    await assert.rejects(db.exec("select * from public.lessons"));
    await db.exec("reset role;");
    await db.query(
      "insert into public.lesson_versions(id, lesson_id, version_no, title, content) values ($1, 'bai-01', 1, 'Bài 1', '{}')",
      [version],
    );
    await db.query("update public.lessons set published_version_id = $1 where id = 'bai-01'", [
      version,
    ]);
    await assert.rejects(db.exec("update public.lesson_versions set title = 'Thay đổi'"));
    await assert.rejects(db.exec("delete from public.lesson_versions"));
    await db.query(
      "insert into public.lessons(id, owner_id, order_no, title) values ('bai-02', $1, 2, 'Bài 2')",
      [teacher],
    );
    await assert.rejects(
      db.query("update public.lessons set published_version_id = $1 where id = 'bai-02'", [
        version,
      ]),
    );
    await db.exec(
      await readFile("supabase/migrations/202610280002_lesson_publication.sql", "utf8"),
    );
    const publishSql = "select public.publish_lesson($1,$2,$3,$4,$5,$6,$7,$8,$9) as id";
    const content = {
      schemaVersion: 1,
      vocab: [],
      grammar: [],
      slides: [{ id: "intro", type: "title", jp: "日本語", vi: "Tiếng Nhật" }],
      questions: [],
    };
    const publishArgs = [
      "rpc-lesson",
      teacher,
      0,
      "Original",
      "日本語",
      "A lesson",
      1,
      "n5",
      content,
    ];
    await asUser(teacher);
    await assert.rejects(db.query(publishSql, publishArgs));
    await db.exec("reset role; set role service_role;");
    const publication = await db.query<{ id: string }>(publishSql, publishArgs);
    const firstId = publication.rows[0].id;
    await assert.rejects(db.query(publishSql, publishArgs), /revision conflict/);
    assert.equal(
      (await db.query("select * from public.lesson_versions where lesson_id='rpc-lesson'")).rows
        .length,
      1,
    );
    await db.query(publishSql, [
      "rpc-lesson",
      teacher,
      1,
      "Updated",
      "日本語",
      "Updated lesson",
      1,
      "n5",
      content,
    ]);
    const original = await db.query<{ title: string }>(
      "select title from public.lesson_versions where id=$1",
      [firstId],
    );
    assert.equal(original.rows[0].title, "Original");
    await assert.rejects(
      db.query(publishSql, [
        "invalid-content",
        teacher,
        0,
        "Invalid",
        "日本語",
        "Invalid lesson",
        1,
        "n5",
        {},
      ]),
    );
    assert.equal(
      (await db.query("select * from public.lessons where id='invalid-content'")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
