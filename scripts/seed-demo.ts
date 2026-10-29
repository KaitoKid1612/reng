import { randomInt } from "node:crypto";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createJoinCode } from "../lib/join-code";
import { createTeachingDraft } from "../lib/teaching-content";
import { buildVocabularyQuestion, teachingReducer } from "../lib/teaching-draft";
import { parseVocabularyTable } from "../lib/teaching-table";
import { generateTeachingSlides } from "../lib/teaching-templates";

import type { SupabaseClient } from "@supabase/supabase-js";

// Development only: demo accounts and a Vietnamese–Chinese class for reviewing the UI.
// Illustrative content written for the demo, not reviewed by a Chinese teacher.
const ACCOUNTS = {
  admin: { email: "admin@reng.local", name: "Quản trị viên demo" },
  teacher: { email: "co.lan@reng.local", name: "Cô Lan" },
  applicant: { email: "thay.minh@reng.local", name: "Thầy Minh" },
  learner: { email: "hoc.vien@reng.local", name: "Nguyễn Văn An" },
} as const;
const LESSON_REQUEST = "6d5f3a9e-1c0b-4e7a-9f31-5b2d8c4e7a10";
const LESSON_TITLE = "Chào hỏi và giới thiệu bản thân";
const CLASS_NAME = "Tiếng Trung nhập môn – tối thứ Ba";
const ASSIGNMENT_TITLE = "Luyện tập: chào hỏi";
const VOCABULARY = [
  "你好\tnǐ hǎo\txin chào\t你好，老师！\tNǐ hǎo, lǎoshī!\tChào thầy/cô!",
  "谢谢\txièxie\tcảm ơn\t谢谢你！\tXièxie nǐ!\tCảm ơn bạn!",
  "老师\tlǎoshī\tthầy/cô giáo\t老师再见！\tLǎoshī zàijiàn!\tChào tạm biệt thầy/cô!",
  "名字\tmíngzi\ttên",
  "再见\tzàijiàn\ttạm biệt",
].join("\n");
const DIALOGUE = [
  { speaker: "A", text: "你好！", reading: "Nǐ hǎo!", meaning: "Xin chào!" },
  {
    speaker: "B",
    text: "你好！你叫什么名字？",
    reading: "Nǐ hǎo! Nǐ jiào shénme míngzi?",
    meaning: "Xin chào! Bạn tên là gì?",
  },
  {
    speaker: "A",
    text: "我叫小明。你呢？",
    reading: "Wǒ jiào Xiǎomíng. Nǐ ne?",
    meaning: "Mình tên là Tiểu Minh. Còn bạn?",
  },
  {
    speaker: "B",
    text: "我叫小红。很高兴认识你！",
    reading: "Wǒ jiào Xiǎohóng. Hěn gāoxìng rènshi nǐ!",
    meaning: "Mình tên là Tiểu Hồng. Rất vui được làm quen!",
  },
];

function buildLessonDraft() {
  let draft = createTeachingDraft(LESSON_TITLE, "starter", "zh-Hans", "");
  draft = teachingReducer(draft, {
    type: "setObjectives",
    objectives: ["Chào hỏi bằng tiếng Trung", "Nói tên mình và hỏi tên bạn"],
  });
  draft = teachingReducer(draft, {
    type: "addVocabRows",
    rows: parseVocabularyTable(VOCABULARY, []).rows,
  });
  draft = teachingReducer(draft, { type: "addGrammar" });
  draft = teachingReducer(draft, {
    type: "updateGrammar",
    id: "grammar-1",
    patch: {
      pattern: "我叫 + tên",
      meaning: "Tôi tên là …",
      explain: "Dùng 叫 (jiào) để nói tên của mình; hỏi tên người khác bằng 你叫什么名字？",
    },
  });
  draft = teachingReducer(draft, { type: "addExample", collection: "grammar", id: "grammar-1" });
  draft = teachingReducer(draft, {
    type: "updateExample",
    collection: "grammar",
    id: "grammar-1",
    index: 0,
    patch: { text: "我叫小明。", reading: "Wǒ jiào Xiǎomíng.", meaning: "Tôi tên là Tiểu Minh." },
  });
  for (const line of DIALOGUE) {
    draft = teachingReducer(draft, { type: "addDialogue" });
    const id = draft.content.dialogue.at(-1)?.id ?? "";
    draft = teachingReducer(draft, { type: "updateDialogue", id, patch: line });
  }
  for (const [vocabId, kind] of [
    ["vocab-1", "meaning"],
    ["vocab-2", "hanzi"],
    ["vocab-3", "pinyin"],
  ] as const) {
    const question = buildVocabularyQuestion(draft.content, vocabId, kind);
    if (!question) {
      throw new Error(`Unable to build the demo question for ${vocabId}.`);
    }
    draft = teachingReducer(draft, { type: "addQuestion", question });
  }
  return teachingReducer(draft, { type: "applySlides", generation: generateTeachingSlides(draft) });
}

async function ensureAccount(
  client: SupabaseClient,
  email: string,
  name: string,
  password: string,
) {
  const { data, error } = await client.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    throw new Error("Unable to list local users. Check that the local stack is running.");
  }
  const existing = data.users.find((user) => user.email === email);
  if (existing) {
    await client.auth.admin.updateUserById(existing.id, { password });
    return existing.id;
  }
  const created = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (created.error || !created.data.user) {
    throw new Error(`Unable to create ${email}.`);
  }
  return created.data.user.id;
}

async function rpc<Schema extends z.ZodType>(
  client: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(`${name} failed: ${error.message}`);
  }
  return schema.parse(data);
}

async function ensureLesson(client: SupabaseClient, teacherId: string) {
  const draft = buildLessonDraft();
  const lessonId = await rpc(
    client,
    "create_teaching_lesson",
    {
      p_teacher_id: teacherId,
      p_request_id: LESSON_REQUEST,
      p_title: draft.title,
      p_order: draft.order,
      p_content: draft.content,
      p_authoring: draft.authoring,
    },
    z.string(),
  );
  const { data: lesson } = await client
    .from("lessons")
    .select("published_version_id, draft_revision")
    .eq("id", lessonId)
    .single();
  if (lesson?.published_version_id) {
    return { lessonId, versionId: String(lesson.published_version_id) };
  }
  const editor = await rpc(
    client,
    "save_teaching_draft",
    {
      p_teacher_id: teacherId,
      p_lesson_id: lessonId,
      p_expected_revision: lesson?.draft_revision ?? 0,
      p_title: draft.title,
      p_order: draft.order,
      p_content: draft.content,
      p_authoring: draft.authoring,
      p_confirmed_ids: draft.content.questions.map((question) => question.id),
    },
    z.object({ revision: z.number().int(), content: z.unknown() }).loose(),
  );
  const versionId = await rpc(
    client,
    "publish_lesson",
    {
      p_lesson_id: lessonId,
      p_owner_id: teacherId,
      p_expected_revision: editor.revision,
      p_title: draft.title,
      p_title_ja: "",
      p_summary: draft.content.objectives.join("; "),
      p_order_no: draft.order,
      p_course_id: "chinese",
      p_content: editor.content,
      p_is_sample: true,
    },
    z.uuid(),
  );
  return { lessonId, versionId };
}

async function ensureClass(client: SupabaseClient, teacherId: string) {
  const { data: existing } = await client
    .from("classes")
    .select("id, join_code")
    .eq("teacher_id", teacherId)
    .eq("name", CLASS_NAME)
    .maybeSingle();
  if (existing) {
    return { classId: String(existing.id), code: String(existing.join_code) };
  }
  const code = createJoinCode((size) => randomInt(size));
  const { data, error } = await client
    .from("classes")
    .insert({
      teacher_id: teacherId,
      name: CLASS_NAME,
      join_code: code,
      capacity: 10,
      meeting_url: "https://meet.google.com/abc-defg-hij",
      subject: "chinese",
      language_tag: "zh-Hans",
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error("Unable to create the demo class.");
  }
  return { classId: String(data.id), code };
}

async function main() {
  const { values } = parseArgs({ options: { password: { type: "string" } } });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const password = values.password ?? process.env.SEED_TEACHER_PASSWORD;
  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY from `npx supabase status -o env`.");
  }
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error("seed:demo only writes to a Supabase stack running on this machine.");
  }
  if (!password || password.length < 8) {
    throw new Error("Provide --password or SEED_TEACHER_PASSWORD with at least 8 characters.");
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ids = {
    admin: await ensureAccount(client, ACCOUNTS.admin.email, ACCOUNTS.admin.name, password),
    teacher: await ensureAccount(client, ACCOUNTS.teacher.email, ACCOUNTS.teacher.name, password),
    applicant: await ensureAccount(
      client,
      ACCOUNTS.applicant.email,
      ACCOUNTS.applicant.name,
      password,
    ),
    learner: await ensureAccount(client, ACCOUNTS.learner.email, ACCOUNTS.learner.name, password),
  };
  await client.from("platform_admins").upsert({ user_id: ids.admin, note: "seed:demo" });
  const { error: teacherError } = await client.from("teacher_accounts").upsert({
    user_id: ids.teacher,
    status: "active",
    activated_at: new Date().toISOString(),
    access_until: "2026-12-31",
    admin_note: "Tài khoản demo",
  });
  if (teacherError) {
    throw new Error("Unable to activate the demo teacher. Apply all migrations first.");
  }
  const { data: request } = await client
    .from("teacher_accounts")
    .select("status")
    .eq("user_id", ids.applicant)
    .maybeSingle();
  if (!request) {
    await rpc(
      client,
      "activate_teacher",
      { p_user_id: ids.applicant, p_terms_version: "2026-10-29" },
      z.string(),
    );
  }
  const { lessonId, versionId } = await ensureLesson(client, ids.teacher);
  const { classId, code } = await ensureClass(client, ids.teacher);
  await rpc(
    client,
    "upsert_class_lesson",
    {
      p_teacher_id: ids.teacher,
      p_class_id: classId,
      p_lesson_id: lessonId,
      p_version_id: versionId,
      p_order_no: 1,
      p_available_at: new Date(Date.now() - 60_000).toISOString(),
    },
    z.unknown(),
  );
  const { data: assignment } = await client
    .from("assignments")
    .select("id")
    .eq("class_id", classId)
    .eq("title", ASSIGNMENT_TITLE)
    .maybeSingle();
  if (!assignment) {
    const { data: version } = await client
      .from("lesson_versions")
      .select("content")
      .eq("id", versionId)
      .single();
    const { questions } = z
      .object({ questions: z.array(z.object({ id: z.string() }).loose()) })
      .loose()
      .parse(version?.content);
    await rpc(
      client,
      "publish_assignment",
      {
        p_teacher_id: ids.teacher,
        p_class_id: classId,
        p_lesson_id: lessonId,
        p_title: ASSIGNMENT_TITLE,
        p_mode: "practice",
        p_due_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        p_allow_late: true,
        p_pass_score: 70,
        p_max_attempts: 3,
        p_feedback_policy: "after_submit",
        p_practice_question_ids: questions.map((question) => question.id),
        p_test_questions: null,
      },
      z.uuid(),
    );
  }
  await rpc(client, "join_class", { p_user_id: ids.learner, p_code: code }, z.unknown());
  console.log(`Demo ready (password: the value you passed). Class code: ${code}`);
  for (const account of Object.values(ACCOUNTS)) {
    console.log(`  ${account.name}: ${account.email}`);
  }
  console.log(`  Lesson ${lessonId}, class ${classId}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to seed the demo.");
  process.exit(1);
});
