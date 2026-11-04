import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { draftContentSchema } from "../lib/lesson-draft";
import { lessonContentSchema } from "../lib/lesson-schema";

const MIGRATION = "20261104063229_normalize_vocabulary_kanji.sql";
const TEACHER = "00000000-0000-4000-8000-000000000091";
const content = {
  schemaVersion: 1,
  vocab: [
    { id: "v1", jp: "ここ", kanji: null, romaji: "koko", vi: "ở đây", audio: null },
    { id: "v2", jp: "がっこう", kanji: "学校", romaji: "gakkou", vi: "trường", audio: null },
    { id: "v3", jp: "そこ", romaji: "soko", vi: "ở đó", audio: null },
  ],
  grammar: [],
  slides: [{ id: "intro", type: "title", jp: "場所", vi: "Địa điểm" }],
  questions: [],
};

test("normalizes old drafts and pinned versions, preserves content and blocks invalid writes", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz,
        raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
    `);
    for (const file of (await readdir("supabase/migrations"))
      .filter((file) => file.endsWith(".sql") && file < MIGRATION)
      .sort()) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.query("insert into auth.users(id, email_confirmed_at) values ($1, now())", [TEACHER]);
    await db.query("update public.profiles set role = 'teacher' where id = $1", [TEACHER]);
    const publication = await db.query<{ id: string }>(
      "select public.publish_lesson('legacy-lesson', $1, 0, 'Bài học', '場所', 'Địa điểm', 1, 'n5', $2) as id",
      [TEACHER, content],
    );
    const versionId = publication.rows[0].id;
    const classRow = await db.query<{ id: string }>(
      "insert into public.classes(teacher_id, name, join_code) values ($1, 'Lớp học', 'ABCDEFGH') returning id",
      [TEACHER],
    );
    await db.query("select public.upsert_class_lesson($1, $2, 'legacy-lesson', $3, 1, now())", [
      TEACHER,
      classRow.rows[0].id,
      versionId,
    ]);
    const beforeVersion = (
      await db.query<{ row: Record<string, unknown> }>(
        "select to_jsonb(v) as row from public.lesson_versions v where id = $1",
        [versionId],
      )
    ).rows[0].row;
    const beforeDraft = (
      await db.query<{ draft_revision: number }>(
        "select draft_revision from public.lessons where id = 'legacy-lesson'",
      )
    ).rows[0];

    const repair = await readFile(`supabase/migrations/${MIGRATION}`, "utf8");
    await db.query(
      "insert into public.lessons(id, owner_id, order_no, title, draft_content) values ('invalid-lesson', $1, 3, 'Invalid', $2)",
      [TEACHER, { ...content, vocab: [{ ...content.vocab[0], kanji: 123 }] }],
    );
    await assert.rejects(db.exec(repair), /lessons_v1_kanji_string/);
    await db.exec("rollback");
    assert.deepEqual(
      (
        await db.query<{ content: unknown }>(
          "select content from public.lesson_versions where id = $1",
          [versionId],
        )
      ).rows[0].content,
      content,
    );
    assert.equal(
      (
        await db.query<{ draft_revision: number }>(
          "select draft_revision from public.lessons where id = 'legacy-lesson'",
        )
      ).rows[0].draft_revision,
      beforeDraft.draft_revision,
    );
    await assert.rejects(
      db.query("update public.lesson_versions set title = 'Changed' where id = $1", [versionId]),
      /immutable/,
    );
    await db.exec("delete from public.lessons where id = 'invalid-lesson'");
    await db.exec(repair);
    const expected = structuredClone(content);
    const { kanji, ...word } = expected.vocab[0];
    void kanji;
    const expectedContent = { ...expected, vocab: [word, ...expected.vocab.slice(1)] };
    const afterVersion = (
      await db.query<{ row: Record<string, unknown> }>(
        "select to_jsonb(v) as row from public.lesson_versions v where id = $1",
        [versionId],
      )
    ).rows[0].row;
    assert.deepEqual(afterVersion, { ...beforeVersion, content: expectedContent });
    const afterDraft = (
      await db.query<{
        draft_content: unknown;
        draft_revision: number;
        published_version_id: string;
      }>(
        "select draft_content, draft_revision, published_version_id from public.lessons where id = 'legacy-lesson'",
      )
    ).rows[0];
    assert.deepEqual(afterDraft.draft_content, expectedContent);
    assert.equal(afterDraft.draft_revision, beforeDraft.draft_revision + 1);
    assert.equal(afterDraft.published_version_id, versionId);
    assert.equal(draftContentSchema.safeParse(afterDraft.draft_content).success, true);
    assert.equal(lessonContentSchema.safeParse(afterVersion.content).success, true);
    assert.equal(
      (
        await db.query<{ lesson_version_id: string }>(
          "select lesson_version_id from public.class_lessons",
        )
      ).rows[0].lesson_version_id,
      versionId,
    );
    await assert.rejects(
      db.query("update public.lesson_versions set title = 'Changed' where id = $1", [versionId]),
      /immutable/,
    );
    for (const invalid of [null, 123, true, {}, [], ["学校"]]) {
      const broken = { ...expectedContent, vocab: [{ ...word, kanji: invalid }] };
      await assert.rejects(
        db.query("update public.lessons set draft_content = $1 where id = 'legacy-lesson'", [
          broken,
        ]),
        /lessons_v1_kanji_string/,
      );
      await assert.rejects(
        db.query(
          "insert into public.lesson_versions(lesson_id, version_no, title, content) values ('legacy-lesson', 2, 'Invalid', $1)",
          [broken],
        ),
        /lesson_versions_v1_kanji_string/,
      );
      assert.equal(draftContentSchema.safeParse(broken).success, false);
      assert.equal(lessonContentSchema.safeParse(broken).success, false);
    }
    const chinese = {
      schemaVersion: 2,
      vocab: [{ id: "zh1", text: "你好", reading: "nǐ hǎo", meaning: "Xin chào", audio: null }],
    };
    await db.query(
      "insert into public.lessons(id, owner_id, order_no, title, draft_content) values ('chinese-lesson', $1, 2, 'Tiếng Trung', $2)",
      [TEACHER, chinese],
    );
    assert.deepEqual(
      (
        await db.query<{ draft_content: unknown }>(
          "select draft_content from public.lessons where id = 'chinese-lesson'",
        )
      ).rows[0].draft_content,
      chinese,
    );
  } finally {
    await db.close();
  }
});
