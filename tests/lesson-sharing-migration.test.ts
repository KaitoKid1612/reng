import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const OWNER = "00000000-0000-4000-8000-000000000021";
const RECIPIENT = "00000000-0000-4000-8000-000000000022";
const STUDENT = "00000000-0000-4000-8000-000000000023";
const OTHER = "00000000-0000-4000-8000-000000000024";
const COPY_REQUEST = "00000000-0000-4000-8000-0000000000c1";

const MIGRATIONS = [
  "202610280001_foundation.sql",
  "202610280002_lesson_publication.sql",
  "202610280003_sample_lessons.sql",
  "202610280004_classroom.sql",
  "202610280005_notifications.sql",
  "202610280006_listening.sql",
  "202610290001_teaching_service.sql",
  "202610290002_teacher_activation.sql",
  "202610290003_teaching_authoring.sql",
  "202610290004_lesson_sharing.sql",
];

const V1_CONTENT = {
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  questions: [],
  slides: [{ id: "s1", type: "title", jp: "あいさつ", vi: "Chào hỏi", teacherNotes: "SECRET-V1" }],
};

const V2_CONTENT = {
  schemaVersion: 2,
  context: {
    subject: "chinese",
    languageTag: "zh-Hans",
    instructionLanguageTag: "vi-VN",
    locale: "zh-CN",
  },
  objectives: ["Chào hỏi"],
  vocab: [],
  grammar: [],
  dialogue: [],
  questions: [],
  slides: [{ id: "g-title", type: "title", text: "Chào hỏi", teacherNotes: "SECRET-V2" }],
};

test("sharing grants one version to active teachers, copies without notes and can be revoked", async () => {
  const db = new PGlite();
  async function one<Row>(sql: string, params: unknown[] = []) {
    const result = await db.query<Row>(sql, params);
    assert.equal(result.rows.length, 1);
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
    for (const file of MIGRATIONS.slice(0, 6)) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.query(
      "insert into auth.users(id, email, email_confirmed_at) values ($1, 'owner@example.test', now()), ($2, 'recipient@example.test', now()), ($3, 'student@example.test', now()), ($4, 'other@example.test', now())",
      [OWNER, RECIPIENT, STUDENT, OTHER],
    );
    await db.query("update public.profiles set role = 'teacher' where id in ($1, $2, $3)", [
      OWNER,
      RECIPIENT,
      OTHER,
    ]);
    await db.query("update public.profiles set full_name = 'Cô Lan' where id = $1", [OWNER]);
    for (const file of MIGRATIONS.slice(6)) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.exec("set role service_role");

    const v1Version = (
      await one<{ id: string }>(
        "select public.publish_lesson('shared-v1', $1, 0, 'Chào hỏi', 'あいさつ', 'Tóm tắt', 1, 'n5', $2) as id",
        [OWNER, V1_CONTENT],
      )
    ).id;
    const v2Lesson = (
      await one<{ id: string }>(
        "select public.create_teaching_lesson($1, gen_random_uuid(), 'Bài Trung', 1, $2, $3) as id",
        [
          OWNER,
          V2_CONTENT,
          {
            templateId: "dialogue",
            templateVersion: 1,
            audience: "",
            prerequisites: "",
            difficulty: "basic",
            step: 4,
            generatedSlides: {},
          },
        ],
      )
    ).id;
    const v2Version = (
      await one<{ id: string }>(
        "select public.publish_lesson($1, $2, 0, 'Bài Trung', '', 'Chào hỏi', 1, 'chinese', $3) as id",
        [v2Lesson, OWNER, V2_CONTENT],
      )
    ).id;

    const share = (
      lesson: string,
      version: string,
      email: string,
      permission: string,
      owner = OWNER,
    ) =>
      one<{ status: string; share_id: string | null }>(
        "select * from public.share_lesson_version($1, $2, $3, $4, $5)",
        [owner, lesson, version, email, permission],
      );
    const granted = await share("shared-v1", v1Version, " Recipient@Example.test ", "view");
    assert.equal(granted.status, "shared");
    for (const email of ["student@example.test", "owner@example.test", "missing@example.test"]) {
      assert.equal(
        (await share("shared-v1", v1Version, email, "view")).status,
        "recipient_not_found",
        `${email} is not another active teacher`,
      );
    }
    await assert.rejects(
      share("shared-v1", v1Version, "recipient@example.test", "view", OTHER),
      /not_found/,
    );
    await assert.rejects(
      share("shared-v1", v2Version, "recipient@example.test", "view"),
      /version_not_found/,
    );

    const read = (user: string, version: string | null) =>
      one<{ row: unknown }>("select public.read_lesson_version($1, 'shared-v1', $2) as row", [
        user,
        version,
      ]);
    assert.ok((await read(RECIPIENT, v1Version)).row, "the recipient reads the granted version");
    assert.equal((await read(RECIPIENT, null)).row, null, "only the granted version is readable");
    assert.equal((await read(OTHER, v1Version)).row, null);

    const copy = (shareId: string, request: string) =>
      one<{ id: string }>("select public.copy_shared_lesson($1, $2, $3) as id", [
        RECIPIENT,
        shareId,
        request,
      ]);
    const shareId = granted.share_id ?? "";
    await assert.rejects(copy(shareId, COPY_REQUEST), /not_found/, "view does not allow copying");
    assert.equal(
      (await share("shared-v1", v1Version, "recipient@example.test", "copy")).share_id,
      shareId,
      "upgrading keeps one active grant",
    );
    const copied = (await copy(shareId, COPY_REQUEST)).id;
    assert.equal(
      (await copy(shareId, COPY_REQUEST)).id,
      copied,
      "a retried copy returns the same draft",
    );
    const copiedRow = await one<{
      owner_id: string;
      draft_content: { slides: Record<string, unknown>[] };
      copied_from_version_id: string;
      copy_attribution: string;
      visibility: string;
    }>(
      "select owner_id, draft_content, copied_from_version_id, copy_attribution, visibility from public.lessons where id = $1",
      [copied],
    );
    assert.equal(copiedRow.owner_id, RECIPIENT);
    assert.equal(copiedRow.visibility, "class");
    assert.equal(copiedRow.copied_from_version_id, v1Version);
    assert.match(copiedRow.copy_attribution, /Cô Lan/);
    assert.ok(
      !JSON.stringify(copiedRow.draft_content).includes("SECRET-V1"),
      "notes are not copied",
    );
    await assert.rejects(
      share(copied, v1Version, "other@example.test", "view", RECIPIENT),
      /reshare_not_allowed/,
    );

    await one("select public.revoke_lesson_share($1, $2)", [OWNER, shareId]);
    assert.equal((await read(RECIPIENT, v1Version)).row, null, "revoking blocks new reads");
    await assert.rejects(copy(shareId, "00000000-0000-4000-8000-0000000000c2"), /not_found/);
    assert.equal((await copy(shareId, COPY_REQUEST)).id, copied, "an earlier copy stays available");
    await assert.rejects(
      one("select public.revoke_lesson_share($1, $2)", [OTHER, shareId]),
      /not_found/,
    );

    const duplicated = (
      await one<{ id: string }>(
        "select public.duplicate_lesson($1, 'shared-v1', '00000000-0000-4000-8000-0000000000d1') as id",
        [OWNER],
      )
    ).id;
    const duplicate = await one<{
      title: string;
      draft_content: unknown;
      copied_from_version_id: string | null;
    }>("select title, draft_content, copied_from_version_id from public.lessons where id = $1", [
      duplicated,
    ]);
    assert.equal(duplicate.title, "Chào hỏi (bản sao)");
    assert.equal(duplicate.copied_from_version_id, null);
    const duplicatedCopy = (
      await one<{ id: string }>(
        "select public.duplicate_lesson($1, $2, '00000000-0000-4000-8000-0000000000d2') as id",
        [RECIPIENT, copied],
      )
    ).id;
    await assert.rejects(
      share(duplicatedCopy, v1Version, "other@example.test", "view", RECIPIENT),
      /reshare_not_allowed/,
      "duplicating a copy keeps its provenance",
    );

    const v2Share = await share(v2Lesson, v2Version, "recipient@example.test", "copy");
    const v2Copy = (await copy(v2Share.share_id ?? "", "00000000-0000-4000-8000-0000000000c3")).id;
    const editor = await one<{
      editor: { reviewedIds: string[]; authoring: { templateId: string } } | null;
    }>("select public.get_teaching_editor($1, $2) as editor", [RECIPIENT, v2Copy]);
    assert.equal(editor.editor?.authoring.templateId, "starter");
    assert.deepEqual(editor.editor?.reviewedIds, []);

    for (let attempt = 0; attempt < 60; attempt++) {
      await share("shared-v1", v1Version, `probe-${attempt}@example.test`, "view");
    }
    assert.equal(
      (await share("shared-v1", v1Version, "other@example.test", "view")).status,
      "rate_limited",
    );

    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [RECIPIENT]);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select * from public.lesson_shares"));
    await assert.rejects(
      db.query("select public.copy_shared_lesson($1, $2, gen_random_uuid())", [RECIPIENT, shareId]),
    );
  } finally {
    await db.close();
  }
});
