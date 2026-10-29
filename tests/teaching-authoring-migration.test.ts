import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const OWNER = "00000000-0000-4000-8000-000000000011";
const LEARNER = "00000000-0000-4000-8000-000000000012";
const OTHER_TEACHER = "00000000-0000-4000-8000-000000000013";
const REQUEST = "00000000-0000-4000-8000-0000000000aa";

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
];

const QUESTION = {
  id: "question-1",
  type: "choice",
  prompt: "你好 nghĩa là gì?",
  options: ["xin chào", "cảm ơn"],
  multiple: false,
  answer: [0],
  explain: "你好 nghĩa là xin chào.",
  points: 1,
  tags: [],
  gradingProfile: "zh-exact-v1",
};

function content(questions: unknown[] = []) {
  return {
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
    questions,
    slides: [{ id: "g-title", type: "title", text: "Chào hỏi" }],
  };
}

const AUTHORING = {
  templateId: "starter",
  templateVersion: 1,
  audience: "Người mới",
  prerequisites: "",
  difficulty: "beginner",
  step: 0,
  generatedSlides: {},
};

test("template authoring creates idempotently, saves with CAS and publishes only reviewed answers", async () => {
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
      "insert into auth.users(id, email_confirmed_at) values ($1, now()), ($2, now()), ($3, now())",
      [OWNER, LEARNER, OTHER_TEACHER],
    );
    await db.query("update public.profiles set role = 'teacher' where id in ($1, $2)", [
      OWNER,
      OTHER_TEACHER,
    ]);
    for (const file of MIGRATIONS.slice(6)) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    await db.exec("set role service_role");

    const create = (teacher: string, title: string, payload: unknown = content()) =>
      one<{ id: string }>("select public.create_teaching_lesson($1, $2, $3, 1, $4, $5) as id", [
        teacher,
        REQUEST,
        title,
        payload,
        { ...AUTHORING, reviewedQuestions: { "question-1": "forged" } },
      ]);
    const lessonId = (await create(OWNER, "Chào hỏi")).id;
    assert.match(lessonId, /^lesson-[a-f0-9]{32}$/);
    assert.equal(
      (await create(OWNER, "Chào hỏi")).id,
      lessonId,
      "a retried request opens the same draft",
    );
    await assert.rejects(create(OWNER, "Khác"), /request_conflict/);
    await assert.rejects(create(LEARNER, "Chào hỏi"), /not_found/);
    await assert.rejects(
      db.query("select public.create_teaching_lesson($1, gen_random_uuid(), 'v1', 1, $2, $3)", [
        OWNER,
        { schemaVersion: 1 },
        AUTHORING,
      ]),
      /invalid_draft/,
    );

    const editor = (teacher: string) =>
      one<{ editor: Record<string, unknown> | null }>(
        "select public.get_teaching_editor($1, $2) as editor",
        [teacher, lessonId],
      );
    const initial = (await editor(OWNER)).editor;
    assert.equal(initial?.revision, 0);
    assert.deepEqual(initial?.reviewedIds, [], "client-supplied reviews are discarded");
    assert.equal(initial?.visibility, "class");
    assert.equal((await editor(OTHER_TEACHER)).editor, null);

    const save = (revision: number, questions: unknown[], confirmed: string[] = []) =>
      one<{ editor: Record<string, unknown> }>(
        "select public.save_teaching_draft($1, $2, $3, 'Chào hỏi', 1, $4, $5, $6) as editor",
        [OWNER, lessonId, revision, content(questions), AUTHORING, confirmed],
      );
    assert.equal((await save(0, [QUESTION])).editor.revision, 1);
    await assert.rejects(save(0, [QUESTION]), /revision_conflict/, "a stale tab cannot overwrite");
    await assert.rejects(save(1, [QUESTION], ["missing"]), /invalid_items/);
    const confirmed = (await save(1, [QUESTION], ["question-1"])).editor;
    assert.deepEqual(confirmed.reviewedIds, ["question-1"]);

    const publish = (revision: number, payload: unknown) =>
      one<{ id: string }>(
        "select public.publish_lesson($1, $2, $3, 'Chào hỏi', '', 'Chào hỏi', 1, 'chinese', $4) as id",
        [lessonId, OWNER, revision, payload],
      );
    await assert.rejects(
      publish(2, content([{ ...QUESTION, answer: [1] }])),
      /save_before_publish/,
      "only the saved draft can be published",
    );
    const edited = { ...QUESTION, prompt: "你好 có nghĩa là gì?" };
    assert.deepEqual((await save(2, [edited])).editor.reviewedIds, [], "editing drops the review");
    await assert.rejects(publish(3, content([edited])), /review_required/);
    await save(3, [edited], ["question-1"]);
    const version = await publish(4, content([edited]));
    const stored = await one<{ content: { schemaVersion: number }; visibility: string }>(
      "select v.content, l.visibility from public.lesson_versions v join public.lessons l on l.id = v.lesson_id where v.id = $1",
      [version.id],
    );
    assert.equal(stored.content.schemaVersion, 2);
    assert.equal(stored.visibility, "class", "publishing never makes the lesson public");
    const read = (user: string) =>
      one<{ row: unknown }>("select public.read_lesson_version($1, $2, $3) as row", [
        user,
        lessonId,
        version.id,
      ]);
    assert.ok((await read(OWNER)).row);
    assert.equal((await read(LEARNER)).row, null);

    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [OWNER]);
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("update public.lessons set authoring_state = '{}' where id = $1", [lessonId]),
      "teachers cannot forge reviews through direct table access",
    );
    await assert.rejects(
      db.query("select public.save_teaching_draft($1, $2, 5, 'x', 1, $3, $4, '{}')", [
        OWNER,
        lessonId,
        content(),
        AUTHORING,
      ]),
    );
  } finally {
    await db.close();
  }
});
