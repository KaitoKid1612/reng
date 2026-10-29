import { z } from "zod";

const text = z.string().trim().min(1);
const identifier = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const audio = z
  .string()
  .regex(/^[a-f0-9]{32}$/)
  .nullable()
  .default(null);
const media = z.string().refine((value) => {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return !value.split("/").includes("..");
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Media must use a local absolute path or HTTPS URL.");

const questionBase = {
  id: identifier,
  prompt: text,
  points: z.number().int().positive(),
  tags: z.array(text).default([]),
  explain: text,
  gradingProfile: z.enum(["ja-default-v1", "zh-exact-v1"]).optional(),
};
const choiceFields = {
  options: z.array(text).min(2),
  multiple: z.boolean().default(false),
  answer: z.array(z.number().int().nonnegative()).min(1),
};
const fillFields = {
  inputMode: z.enum(["hiragana", "katakana", "japanese", "chinese", "pinyin"]).default("hiragana"),
  kanjiStrict: z.boolean().default(false),
  answer: z.array(text).min(1),
};
const questionUnion = z.discriminatedUnion("type", [
  z.object({ ...questionBase, type: z.literal("choice"), ...choiceFields }).strict(),
  z.object({ ...questionBase, type: z.literal("fill"), ...fillFields }).strict(),
  z
    .object({
      ...questionBase,
      type: z.literal("match"),
      left: z.array(text).min(1),
      right: z.array(text).min(1),
      answer: z
        .array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]))
        .min(1),
    })
    .strict(),
  z
    .object({
      ...questionBase,
      type: z.literal("order"),
      tokens: z.array(z.object({ id: identifier, text }).strict()).min(1),
      answer: z.array(identifier).min(1),
    })
    .strict(),
  z
    .object({
      ...questionBase,
      type: z.literal("listen"),
      responseType: z.enum(["choice", "fill"]),
      audio,
      transcript: text,
      maxListens: z.number().int().positive().nullable().default(null),
      options: z.array(text).min(2).optional(),
      answer: z.union([z.array(z.number().int().nonnegative()).min(1), z.array(text).min(1)]),
    })
    .strict(),
  z
    .object({
      ...questionBase,
      type: z.literal("dictation"),
      ...fillFields,
      audio,
      transcript: text,
      maxListens: z.number().int().positive().nullable().default(null),
    })
    .strict(),
]);

export const questionSchema = questionUnion.superRefine((question, context) => {
  if (
    question.type === "choice" ||
    (question.type === "listen" && question.responseType === "choice")
  ) {
    const options = question.options || [];
    if (
      !options.length ||
      question.answer.some((answer) => typeof answer !== "number" || answer >= options.length) ||
      new Set<string | number>(question.answer).size !== question.answer.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Choice answers must reference unique valid options.",
      });
    }
    if (question.type === "choice" && !question.multiple && question.answer.length !== 1) {
      context.addIssue({
        code: "custom",
        message: "Single-choice questions require exactly one correct answer.",
      });
    }
  }
  if (
    question.type === "listen" &&
    question.responseType === "fill" &&
    question.answer.some((answer) => typeof answer !== "string")
  ) {
    context.addIssue({ code: "custom", message: "Listening fill answers must be strings." });
  }
  if ((question.type === "listen" || question.type === "dictation") && !question.audio) {
    context.addIssue({ code: "custom", message: "Listening questions require an audio asset." });
  }
  if (question.type === "match") {
    const leftIndices = question.answer.map(([left]) => left);
    const rightIndices = question.answer.map(([, right]) => right);
    if (
      question.left.length !== question.right.length ||
      question.answer.length !== question.left.length ||
      new Set(leftIndices).size !== question.left.length ||
      new Set(rightIndices).size !== question.right.length ||
      question.answer.some(
        ([left, right]) => left >= question.left.length || right >= question.right.length,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Matching answers must pair every item exactly once.",
      });
    }
  }
  if (question.type === "order") {
    const ids = question.tokens.map((token) => token.id);
    if (
      new Set(ids).size !== ids.length ||
      question.answer.length !== ids.length ||
      new Set<string | number>(question.answer).size !== ids.length ||
      question.answer.some((answer) => !ids.includes(answer))
    ) {
      context.addIssue({
        code: "custom",
        message: "Order answers must contain every unique token ID exactly once.",
      });
    }
  }
});

const slideBase = { id: identifier, teacherNotes: z.string().optional() };
export const slideSchema = z.discriminatedUnion("type", [
  z.object({ ...slideBase, type: z.literal("title"), jp: text, vi: text }).strict(),
  z
    .object({ ...slideBase, type: z.literal("vocab"), refs: z.array(identifier).min(1).max(8) })
    .strict(),
  z.object({ ...slideBase, type: z.literal("grammar"), ref: identifier }).strict(),
  z
    .object({
      ...slideBase,
      type: z.literal("example"),
      ref: identifier,
      reveal: z.boolean().default(false),
    })
    .strict(),
  z.object({ ...slideBase, type: z.literal("quiz"), ref: identifier }).strict(),
  z.object({ ...slideBase, type: z.literal("note"), title: text, body: text }).strict(),
  z
    .object({
      ...slideBase,
      type: z.literal("image"),
      src: media,
      alt: text,
      caption: z.string().optional(),
    })
    .strict(),
]);

export const lessonContentSchema = z
  .object({
    schemaVersion: z.literal(1),
    vocab: z.array(
      z
        .object({
          id: identifier,
          jp: text,
          kanji: z.string().optional(),
          romaji: text,
          vi: text,
          audio,
          note: z.string().optional(),
        })
        .strict(),
    ),
    grammar: z.array(
      z
        .object({
          id: identifier,
          pattern: text,
          vi: text,
          explain: text,
          viMistake: z.string().optional(),
          examples: z.array(z.object({ jp: text, vi: text, audio }).strict()).min(1),
        })
        .strict(),
    ),
    slides: z.array(slideSchema).min(1),
    questions: z.array(questionSchema),
  })
  .strict()
  .superRefine((content, context) => {
    const ids = [...content.vocab, ...content.grammar, ...content.slides, ...content.questions].map(
      (item) => item.id,
    );
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "Lesson item IDs must be unique." });
    }
    for (const slide of content.slides) {
      let isValid = true;
      if (slide.type === "vocab") {
        isValid =
          new Set(slide.refs).size === slide.refs.length &&
          slide.refs.every((id) => content.vocab.some((item) => item.id === id));
      }
      if (slide.type === "grammar" || slide.type === "example") {
        isValid = content.grammar.some((item) => item.id === slide.ref);
      }
      if (slide.type === "quiz") {
        isValid = content.questions.some(
          (item) => item.id === slide.ref && (item.type === "choice" || item.type === "fill"),
        );
      }
      if (!isValid) {
        context.addIssue({ code: "custom", message: `Invalid reference in slide ${slide.id}.` });
      }
    }
  });

const metadata = {
  title: text,
  titleJa: text,
  summary: text,
  order: z.number().int().positive(),
  courseId: identifier.default("n5"),
  isSample: z.boolean().default(false),
};
export const lessonDraftSchema = z
  .object({ id: identifier, ...metadata, content: lessonContentSchema })
  .strict();
export const lessonVersionSchema = z
  .object({
    id: z.string().uuid(),
    lessonId: identifier,
    versionNo: z.number().int().positive(),
    publishedAt: z.string().datetime({ offset: true }),
    ...metadata,
    content: lessonContentSchema,
  })
  .strict();
export const lessonCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    lessons: z.array(
      z
        .object({
          id: identifier,
          publishedVersionId: z.string().uuid(),
          visibility: z.enum(["public", "class"]),
        })
        .strict(),
    ),
    versions: z.array(lessonVersionSchema),
  })
  .strict()
  .superRefine((catalog, context) => {
    if (
      new Set(catalog.lessons.map((lesson) => lesson.id)).size !== catalog.lessons.length ||
      new Set(catalog.versions.map((version) => version.id)).size !== catalog.versions.length
    ) {
      context.addIssue({ code: "custom", message: "Catalog identifiers must be unique." });
    }
    const numbers = catalog.versions.map((version) => `${version.lessonId}/${version.versionNo}`);
    if (new Set(numbers).size !== numbers.length) {
      context.addIssue({ code: "custom", message: "Version numbers must be unique per lesson." });
    }
    for (const lesson of catalog.lessons) {
      if (
        !catalog.versions.some(
          (version) => version.id === lesson.publishedVersionId && version.lessonId === lesson.id,
        )
      ) {
        context.addIssue({
          code: "custom",
          message: `Invalid published version for ${lesson.id}.`,
        });
      }
    }
  });

export type LessonDraft = z.infer<typeof lessonDraftSchema>;
export type LessonVersion = z.infer<typeof lessonVersionSchema>;
export type LessonContent = z.infer<typeof lessonContentSchema>;
export type LessonCatalog = z.infer<typeof lessonCatalogSchema>;
export type LessonQuestion = z.infer<typeof questionSchema>;
export type LessonSlide = z.infer<typeof slideSchema>;

export function toPublicLesson(version: LessonVersion) {
  return {
    ...version,
    content: {
      schemaVersion: version.content.schemaVersion,
      vocab: version.content.vocab,
      grammar: version.content.grammar,
      slides: version.content.slides.map(({ teacherNotes, ...slide }) => {
        void teacherNotes;
        return slide;
      }),
      questions: version.content.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        points: question.points,
        tags: question.tags,
        options: question.type === "choice" ? question.options : undefined,
      })),
    },
  };
}

export type PublicLesson = ReturnType<typeof toPublicLesson>;
export type PublicSlide = PublicLesson["content"]["slides"][number];
