import { z } from "zod";

import { questionSchema, toPublicLesson } from "@/lib/lesson-schema";

import type { LessonQuestion, LessonVersion, PublicLesson } from "@/lib/lesson-schema";

// Schema v2 keeps Chinese content in language-neutral fields (text/reading/meaning) instead of
// the Japanese v1 fields, so v1 snapshots and their grading stay untouched.

const identifier = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/)
  .max(100);
const draftText = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => draftText(max).min(1);
const audio = z
  .string()
  .regex(/^[a-f0-9]{32}$/)
  .nullable()
  .default(null);

export const TEMPLATE_IDS = ["starter", "vocabulary", "dialogue", "review"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEACHING_TEMPLATES: readonly { id: TemplateId; label: string; hint: string }[] = [
  {
    id: "starter",
    label: "Buổi đầu làm quen",
    hint: "Một mục tiêu nhỏ, vài từ và câu chào quen thuộc.",
  },
  { id: "vocabulary", label: "Dạy từ mới", hint: "Nhập bảng từ và ví dụ, hệ thống dựng slide." },
  { id: "dialogue", label: "Luyện hội thoại", hint: "Tình huống đơn giản với các lượt lời ngắn." },
  { id: "review", label: "Ôn tập", hint: "Nhắc lại từ đã học và thêm câu luyện." },
];

export const LANGUAGE_TAGS = ["zh-Hans", "zh-Hant"] as const;
export type ChineseLanguageTag = (typeof LANGUAGE_TAGS)[number];

export const LANGUAGE_LABELS: Record<ChineseLanguageTag, string> = {
  "zh-Hans": "Tiếng Trung giản thể",
  "zh-Hant": "Tiếng Trung phồn thể",
};

export const teachingContextSchema = z
  .object({
    subject: z.literal("chinese"),
    languageTag: z.enum(LANGUAGE_TAGS),
    instructionLanguageTag: z.literal("vi-VN"),
    locale: z.enum(["zh-CN", "zh-TW"]),
  })
  .strict()
  .refine(
    (context) => context.locale === (context.languageTag === "zh-Hans" ? "zh-CN" : "zh-TW"),
    "The voice locale must match the written script.",
  );

export type TeachingContext = z.infer<typeof teachingContextSchema>;

export function createTeachingContext(languageTag: ChineseLanguageTag): TeachingContext {
  return {
    subject: "chinese",
    languageTag,
    instructionLanguageTag: "vi-VN",
    locale: languageTag === "zh-Hans" ? "zh-CN" : "zh-TW",
  };
}

const exampleSchema = z
  .object({ text: draftText(300), reading: draftText(300), meaning: draftText(300) })
  .strict();
const vocabularySchema = z
  .object({
    id: identifier,
    text: draftText(100),
    reading: draftText(200),
    meaning: draftText(300),
    examples: z.array(exampleSchema).max(10),
    audio,
  })
  .strict();
const grammarSchema = z
  .object({
    id: identifier,
    pattern: draftText(200),
    meaning: draftText(300),
    explain: draftText(1000),
    examples: z.array(exampleSchema).max(10),
  })
  .strict();
const dialogueSchema = z
  .object({
    id: identifier,
    speaker: draftText(40),
    text: draftText(300),
    reading: draftText(300),
    meaning: draftText(300),
    audio,
  })
  .strict();

const draftQuestionBase = {
  id: identifier,
  prompt: draftText(500),
  explain: draftText(1000),
  points: z.number().int().min(1).max(100),
  tags: z.array(draftText(100)).max(20).default([]),
  gradingProfile: z.literal("zh-exact-v1").default("zh-exact-v1"),
};
const draftQuestionSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...draftQuestionBase,
      type: z.literal("choice"),
      options: z.array(draftText(120)).min(2).max(6),
      multiple: z.boolean().default(false),
      answer: z.array(z.number().int().nonnegative()).max(6),
    })
    .strict(),
  z
    .object({
      ...draftQuestionBase,
      type: z.literal("fill"),
      inputMode: z.enum(["chinese", "pinyin"]),
      kanjiStrict: z.literal(false).default(false),
      answer: z.array(draftText(200)).max(10),
    })
    .strict(),
]);

const slideBase = { id: identifier, teacherNotes: draftText(2000).optional() };
export const teachingSlideSchema = z.discriminatedUnion("type", [
  z.object({ ...slideBase, type: z.literal("title"), text: draftText(200) }).strict(),
  z
    .object({ ...slideBase, type: z.literal("note"), title: draftText(100), body: draftText(1000) })
    .strict(),
  z
    .object({ ...slideBase, type: z.literal("vocab"), refs: z.array(identifier).min(1).max(2) })
    .strict(),
  z
    .object({
      ...slideBase,
      type: z.literal("examples"),
      ref: identifier,
      index: z.number().int().nonnegative(),
    })
    .strict(),
  z.object({ ...slideBase, type: z.literal("grammar"), ref: identifier }).strict(),
  z
    .object({ ...slideBase, type: z.literal("dialogue"), refs: z.array(identifier).min(1).max(4) })
    .strict(),
  z.object({ ...slideBase, type: z.literal("quiz"), ref: identifier }).strict(),
]);

const contentShape = {
  schemaVersion: z.literal(2),
  context: teachingContextSchema,
  objectives: z.array(draftText(200)).max(5),
  vocab: z.array(vocabularySchema).max(100),
  grammar: z.array(grammarSchema).max(50),
  dialogue: z.array(dialogueSchema).max(100),
  slides: z.array(teachingSlideSchema).max(200),
};

export const teachingDraftContentSchema = z
  .object({ ...contentShape, questions: z.array(draftQuestionSchema).max(100) })
  .strict();

export const authoringStateSchema = z
  .object({
    templateId: z.enum(TEMPLATE_IDS),
    templateVersion: z.literal(1),
    audience: draftText(300),
    prerequisites: draftText(500),
    difficulty: z.enum(["beginner", "basic", "intermediate"]),
    step: z.number().int().min(0).max(4),
    // The last generated value of each generated slide distinguishes manual edits.
    generatedSlides: z.record(z.string(), teachingSlideSchema).default({}),
  })
  .strict();

export const teachingDraftSchema = z
  .object({
    title: draftText(160),
    order: z.number().int().min(1).max(999),
    content: teachingDraftContentSchema,
    authoring: authoringStateSchema,
  })
  .strict();

export type TeachingDraft = z.infer<typeof teachingDraftSchema>;
export type TeachingDraftContent = TeachingDraft["content"];
export type AuthoringState = z.infer<typeof authoringStateSchema>;
export type TeachingSlide = z.infer<typeof teachingSlideSchema>;
export type TeachingVocab = TeachingDraftContent["vocab"][number];
export type TeachingGrammar = TeachingDraftContent["grammar"][number];
export type TeachingDialogueLine = TeachingDraftContent["dialogue"][number];
export type TeachingExample = TeachingVocab["examples"][number];
export type TeachingDraftQuestion = TeachingDraftContent["questions"][number];

export const DIFFICULTY_LABELS: Record<AuthoringState["difficulty"], string> = {
  beginner: "Nhập môn",
  basic: "Cơ bản",
  intermediate: "Trung cấp",
};

export function createTeachingDraft(
  title: string,
  templateId: TemplateId,
  languageTag: ChineseLanguageTag,
  objective: string,
): TeachingDraft {
  return {
    title,
    order: 1,
    content: {
      schemaVersion: 2,
      context: createTeachingContext(languageTag),
      objectives: objective ? [objective] : [],
      vocab: [],
      grammar: [],
      dialogue: [],
      questions: [],
      slides: [],
    },
    authoring: {
      templateId,
      templateVersion: 1,
      audience: "Người Việt mới bắt đầu học tiếng Trung",
      prerequisites: "",
      difficulty: "beginner",
      step: 0,
      generatedSlides: {},
    },
  };
}

// Slide readability limits for 1280x720; longer content must be split, never truncated.
export const SLIDE_LIMITS = { word: 40, meaning: 160, line: 80, lineMeaning: 180 } as const;

export interface TeachingReport {
  problems: string[];
  warnings: string[];
}

// Server and editor share these checks; publishing also requires server-side answer reviews.
export function reviewTeachingDraft(draft: TeachingDraft): TeachingReport {
  const problems: string[] = [];
  const warnings: string[] = [];
  const { content } = draft;
  if (!draft.title) {
    problems.push("Nhập tiêu đề bài.");
  }
  if (!content.objectives.length || content.objectives.some((objective) => !objective)) {
    problems.push("Nhập ít nhất một mục tiêu nhỏ và xóa dòng mục tiêu trống.");
  }
  if (!content.slides.length) {
    problems.push("Dựng slide từ nội dung hoặc thêm ít nhất một slide.");
  }
  const ids = [
    ...content.vocab,
    ...content.grammar,
    ...content.dialogue,
    ...content.questions,
    ...content.slides,
  ].map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    problems.push("Có mục nội dung trùng mã. Xóa rồi thêm lại mục đó.");
  }
  for (const [index, item] of content.vocab.entries()) {
    const label = `Từ ${index + 1}`;
    if (!item.text || !item.meaning) {
      problems.push(`${label}: cần chữ Hán và nghĩa tiếng Việt.`);
    }
    if (item.text.length > SLIDE_LIMITS.word || item.meaning.length > SLIDE_LIMITS.meaning) {
      problems.push(`${label}: nội dung quá dài cho slide, hãy tách thành các mục ngắn.`);
    }
    if (item.text && !item.reading) {
      warnings.push(`${label} (${item.text}) chưa có pinyin. Kiểm tra lại cách đọc.`);
    }
    for (const example of item.examples) {
      if (!example.text || !example.meaning) {
        problems.push(`${label}: câu ví dụ cần câu tiếng Trung và nghĩa tiếng Việt.`);
      }
    }
  }
  for (const [index, item] of content.grammar.entries()) {
    if (!item.pattern || !item.meaning) {
      problems.push(`Mẫu câu ${index + 1}: cần mẫu câu và nghĩa tiếng Việt.`);
    }
    for (const example of item.examples) {
      if (!example.text || !example.meaning) {
        problems.push(`Mẫu câu ${index + 1}: câu ví dụ cần câu và nghĩa tiếng Việt.`);
      }
    }
  }
  for (const [index, item] of content.dialogue.entries()) {
    if (!item.text || !item.meaning) {
      problems.push(`Lượt thoại ${index + 1}: cần câu tiếng Trung và nghĩa tiếng Việt.`);
    }
    if (item.text.length > SLIDE_LIMITS.line || item.meaning.length > SLIDE_LIMITS.lineMeaning) {
      problems.push(`Lượt thoại ${index + 1}: tách thành các lượt ngắn để đọc rõ trên slide.`);
    }
  }
  for (const [index, question] of content.questions.entries()) {
    const label = `Câu luyện ${index + 1}`;
    if (!question.prompt || !question.explain) {
      problems.push(`${label}: cần đề bài và lời giải thích.`);
    }
    if (question.type === "choice") {
      if (
        question.options.some((option) => !option) ||
        new Set(question.options).size !== question.options.length
      ) {
        problems.push(`${label}: lựa chọn không được trống hoặc trùng nhau.`);
      }
      if (
        question.answer.length !== 1 ||
        question.answer.some((answer) => answer >= question.options.length)
      ) {
        problems.push(`${label}: chọn đúng một đáp án.`);
      }
    } else if (!question.answer.length || question.answer.some((answer) => !answer)) {
      problems.push(`${label}: nhập ít nhất một đáp án đúng, không để dòng trống.`);
    }
  }
  for (const [index, slide] of content.slides.entries()) {
    const label = `Slide ${index + 1}`;
    if (!isSlideComplete(slide, content)) {
      problems.push(`${label}: thiếu nội dung hoặc tham chiếu mục đã xóa.`);
    }
  }
  return { problems, warnings };
}

function isSlideComplete(slide: TeachingSlide, content: TeachingDraftContent) {
  switch (slide.type) {
    case "title":
      return Boolean(slide.text);
    case "note":
      return Boolean(slide.title && slide.body);
    case "vocab":
      return slide.refs.every((id) => content.vocab.some((item) => item.id === id));
    case "examples":
      return Boolean(content.vocab.find((item) => item.id === slide.ref)?.examples[slide.index]);
    case "grammar":
      return content.grammar.some((item) => item.id === slide.ref);
    case "dialogue":
      return slide.refs.every((id) => content.dialogue.some((item) => item.id === id));
    case "quiz":
      return content.questions.some((item) => item.id === slide.ref);
  }
}

// Published questions use the shared v1 question contract so assignments and grading reuse it.
export const teachingPublishedContentSchema = z
  .object({
    ...contentShape,
    objectives: z.array(requiredText(200)).min(1).max(5),
    slides: z.array(teachingSlideSchema).min(1).max(200),
    questions: z.array(questionSchema).max(100),
  })
  .strict();

export type TeachingContent = z.infer<typeof teachingPublishedContentSchema>;

export const teachingVersionSchema = z
  .object({
    id: z.uuid(),
    lessonId: identifier,
    versionNo: z.number().int().positive(),
    publishedAt: z.iso.datetime({ offset: true }),
    title: requiredText(160),
    summary: z.string(),
    order: z.number().int().positive(),
    courseId: identifier,
    isSample: z.boolean(),
    content: teachingPublishedContentSchema,
  })
  .strict();

export type TeachingVersion = z.infer<typeof teachingVersionSchema>;
export type AnyLessonVersion = LessonVersion | TeachingVersion;

export function isTeachingVersion(version: AnyLessonVersion): version is TeachingVersion {
  return version.content.schemaVersion === 2;
}

export function parseTeachingVersion(row: Record<string, unknown>): TeachingVersion {
  return teachingVersionSchema.parse({
    id: row.id,
    lessonId: row.lesson_id,
    versionNo: row.version_no,
    publishedAt: row.published_at,
    title: row.title,
    summary: row.summary,
    order: row.order_no,
    courseId: row.course_id,
    isSample: row.is_sample,
    content: row.content,
  });
}

export interface PublicQuestion {
  id: string;
  type: LessonQuestion["type"];
  prompt: string;
  points: number;
  tags: string[];
  options?: string[];
}

export function toPublicQuestion(question: LessonQuestion): PublicQuestion {
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    points: question.points,
    tags: question.tags,
    options: question.type === "choice" ? question.options : undefined,
  };
}

// Learners never receive teacher notes or answers; feedback comes from the question API.
export function toPublicTeachingLesson(version: TeachingVersion) {
  return {
    ...version,
    content: {
      ...version.content,
      slides: version.content.slides.map(({ teacherNotes, ...slide }) => {
        void teacherNotes;
        return slide;
      }),
      questions: version.content.questions.map(toPublicQuestion),
    },
  };
}

export type PublicTeachingLesson = ReturnType<typeof toPublicTeachingLesson>;
export type PublicTeachingSlide = PublicTeachingLesson["content"]["slides"][number];

export type PublicAnyLesson = PublicLesson | PublicTeachingLesson;

export function toPublicAnyLesson(version: AnyLessonVersion): PublicAnyLesson {
  return isTeachingVersion(version) ? toPublicTeachingLesson(version) : toPublicLesson(version);
}

export function isPublicTeachingLesson(lesson: PublicAnyLesson): lesson is PublicTeachingLesson {
  return lesson.content.schemaVersion === 2;
}
