import { z } from "zod";

import { INPUT_MODES } from "@/lib/assignment";
import { lessonContentSchema, questionSchema } from "@/lib/lesson-schema";

import type { LessonContent } from "@/lib/lesson-schema";

export const MAX_DRAFT_BYTES = 512 * 1024;
export const MAX_VOCAB_ITEMS = 300;

const identifier = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/)
  .max(64);
const reference = z.string().max(64);
const audio = z
  .string()
  .regex(/^[a-f0-9]{32}$/)
  .nullable()
  .default(null);
const draftText = (max: number) => z.string().max(max);
const teacherNotes = z.string().max(2000).optional();

// Drafts may be unfinished: empty text and unset references are allowed until publishing.
const draftVocabSchema = z
  .object({
    id: identifier,
    jp: draftText(100),
    kanji: draftText(100).optional(),
    romaji: draftText(100),
    vi: draftText(200),
    audio,
    note: draftText(500).optional(),
  })
  .strict();

const draftExampleSchema = z.object({ jp: draftText(300), vi: draftText(300), audio }).strict();

const draftGrammarSchema = z
  .object({
    id: identifier,
    pattern: draftText(200),
    vi: draftText(300),
    explain: draftText(2000),
    viMistake: draftText(1000).optional(),
    examples: z.array(draftExampleSchema).max(20),
  })
  .strict();

const draftSlideSchema = z.discriminatedUnion("type", [
  z
    .object({
      id: identifier,
      teacherNotes,
      type: z.literal("title"),
      jp: draftText(200),
      vi: draftText(200),
    })
    .strict(),
  z
    .object({
      id: identifier,
      teacherNotes,
      type: z.literal("vocab"),
      refs: z.array(identifier).max(8),
    })
    .strict(),
  z.object({ id: identifier, teacherNotes, type: z.literal("grammar"), ref: reference }).strict(),
  z
    .object({
      id: identifier,
      teacherNotes,
      type: z.literal("example"),
      ref: reference,
      reveal: z.boolean().default(false),
    })
    .strict(),
  z.object({ id: identifier, teacherNotes, type: z.literal("quiz"), ref: reference }).strict(),
  z
    .object({
      id: identifier,
      teacherNotes,
      type: z.literal("note"),
      title: draftText(200),
      body: draftText(2000),
    })
    .strict(),
  z
    .object({
      id: identifier,
      teacherNotes,
      type: z.literal("image"),
      src: draftText(500),
      alt: draftText(300),
      caption: draftText(300).optional(),
    })
    .strict(),
]);

const questionFields = {
  id: identifier,
  prompt: draftText(500),
  explain: draftText(1000),
  points: z.number().int().min(0).max(100),
  tags: z.array(z.string().max(40)).max(10).default([]),
};

const draftChoiceSchema = z
  .object({
    ...questionFields,
    type: z.literal("choice"),
    options: z.array(draftText(120)).max(8),
    multiple: z.boolean().default(false),
    answer: z.array(z.number().int().nonnegative()).max(8),
  })
  .strict();

const draftFillSchema = z
  .object({
    ...questionFields,
    type: z.literal("fill"),
    inputMode: z.enum(INPUT_MODES).default("hiragana"),
    kanjiStrict: z.boolean().default(false),
    answer: z.array(draftText(120)).max(10),
  })
  .strict();

// Other question types are kept exactly as authored; the web editor shows them read-only.
const draftQuestionSchema = z.union([draftChoiceSchema, draftFillSchema, questionSchema]);

export const draftContentSchema = z
  .object({
    schemaVersion: z.literal(1),
    vocab: z.array(draftVocabSchema).max(MAX_VOCAB_ITEMS),
    grammar: z.array(draftGrammarSchema).max(100),
    slides: z.array(draftSlideSchema).max(200),
    questions: z.array(draftQuestionSchema).max(200),
  })
  .strict()
  .superRefine((content, context) => {
    const ids = collectItemIds(content);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "Lesson item IDs must be unique." });
    }
  });

export const draftMetadataSchema = z
  .object({
    title: draftText(160),
    titleJa: draftText(160),
    summary: draftText(500),
    order: z.number().int().min(0).max(999),
    courseId: identifier,
  })
  .strict();

export type DraftContent = z.infer<typeof draftContentSchema>;
export type DraftMetadata = z.infer<typeof draftMetadataSchema>;
export type DraftVocab = DraftContent["vocab"][number];
export type DraftGrammar = DraftContent["grammar"][number];
export type DraftSlide = DraftContent["slides"][number];
export type DraftQuestion = DraftContent["questions"][number];
export type SlideType = DraftSlide["type"];

export interface LessonDraftState {
  metadata: DraftMetadata;
  content: DraftContent;
}

export const lessonDraftStateSchema = z
  .object({ metadata: draftMetadataSchema, content: draftContentSchema })
  .strict();

export const EMPTY_DRAFT_CONTENT: DraftContent = {
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  slides: [],
  questions: [],
};

export function parseLessonDraftState(value: unknown): LessonDraftState {
  if (new TextEncoder().encode(JSON.stringify(value ?? null)).length > MAX_DRAFT_BYTES) {
    throw new Error("Lesson draft is too large.");
  }
  return lessonDraftStateSchema.parse(value);
}

function collectItemIds(content: Pick<DraftContent, "vocab" | "grammar" | "slides" | "questions">) {
  return [...content.vocab, ...content.grammar, ...content.slides, ...content.questions].map(
    (item) => item.id,
  );
}

const ID_PREFIXES = { vocab: "v", grammar: "g", slide: "s", question: "q" } as const;
const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export type ItemKind = keyof typeof ID_PREFIXES;

// Random suffixes keep IDs from being reused for a different meaning after a deletion,
// which would silently repoint review cards keyed by lesson and item ID.
export function createItemId(
  kind: ItemKind,
  content: DraftContent,
  random: () => number = Math.random,
) {
  const used = new Set(collectItemIds(content));
  for (;;) {
    let suffix = "";
    for (let index = 0; index < 6; index++) {
      suffix += ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length)];
    }
    const id = `${ID_PREFIXES[kind]}-${suffix}`;
    if (!used.has(id)) {
      return id;
    }
  }
}

export function createSlide(type: SlideType, id: string): DraftSlide {
  switch (type) {
    case "title":
      return { id, type, jp: "", vi: "" };
    case "vocab":
      return { id, type, refs: [] };
    case "grammar":
      return { id, type, ref: "" };
    case "example":
      return { id, type, ref: "", reveal: true };
    case "quiz":
      return { id, type, ref: "" };
    case "note":
      return { id, type, title: "", body: "" };
    case "image":
      return { id, type, src: "", alt: "" };
  }
}

export function findReferencingSlides(content: DraftContent, itemId: string) {
  return content.slides.filter((slide) =>
    slide.type === "vocab" ? slide.refs.includes(itemId) : "ref" in slide && slide.ref === itemId,
  );
}

export function isEditableQuestion(
  question: DraftQuestion,
): question is z.infer<typeof draftChoiceSchema> | z.infer<typeof draftFillSchema> {
  return question.type === "choice" || question.type === "fill";
}

export interface PublishProblem {
  section: "info" | "vocab" | "grammar" | "questions" | "slides";
  itemId?: string;
  message: string;
}

const blank = (value: string | undefined) => !value || !value.trim();
const containsKanji = (value: string) => /\p{Script=Han}/u.test(value);

function isAllowedMedia(source: string) {
  if (source.startsWith("/") && !source.startsWith("//") && !source.includes("\\")) {
    return !source.split("/").includes("..");
  }
  try {
    return new URL(source).protocol === "https:";
  } catch {
    return false;
  }
}

function describeMetadataProblems(metadata: DraftMetadata): PublishProblem[] {
  const problems: PublishProblem[] = [];
  if (blank(metadata.title)) {
    problems.push({ section: "info", message: "Nhập tiêu đề tiếng Việt." });
  }
  if (blank(metadata.titleJa)) {
    problems.push({ section: "info", message: "Nhập tiêu đề tiếng Nhật." });
  }
  if (blank(metadata.summary)) {
    problems.push({ section: "info", message: "Nhập tóm tắt bài." });
  }
  if (metadata.order < 1) {
    problems.push({ section: "info", message: "Thứ tự bài là số từ 1 đến 999." });
  }
  return problems;
}

function describeVocabProblems(content: DraftContent): PublishProblem[] {
  return content.vocab.flatMap((item, index) => {
    const label = `Từ vựng ${index + 1}${item.jp ? ` (${item.jp})` : ""}`;
    const missing = [
      blank(item.jp) && "cách đọc kana",
      blank(item.romaji) && "romaji",
      blank(item.vi) && "nghĩa tiếng Việt",
    ].filter(Boolean);
    return missing.length
      ? [
          {
            section: "vocab" as const,
            itemId: item.id,
            message: `${label}: thiếu ${missing.join(", ")}.`,
          },
        ]
      : [];
  });
}

function describeGrammarProblems(content: DraftContent): PublishProblem[] {
  return content.grammar.flatMap((item, index) => {
    const label = `Mẫu câu ${index + 1}${item.pattern ? ` (${item.pattern})` : ""}`;
    const problems: PublishProblem[] = [];
    const missing = [
      blank(item.pattern) && "mẫu",
      blank(item.vi) && "nghĩa",
      blank(item.explain) && "giải thích",
    ].filter(Boolean);
    if (missing.length) {
      problems.push({
        section: "grammar",
        itemId: item.id,
        message: `${label}: thiếu ${missing.join(", ")}.`,
      });
    }
    if (!item.examples.length) {
      problems.push({
        section: "grammar",
        itemId: item.id,
        message: `${label}: cần ít nhất một câu ví dụ.`,
      });
    }
    item.examples.forEach((example, exampleIndex) => {
      if (blank(example.jp) || blank(example.vi)) {
        problems.push({
          section: "grammar",
          itemId: item.id,
          message: `${label}: ví dụ ${exampleIndex + 1} cần cả câu tiếng Nhật và nghĩa.`,
        });
      }
    });
    return problems;
  });
}

function describeQuestionProblems(content: DraftContent): PublishProblem[] {
  return content.questions.flatMap((question, index): PublishProblem[] => {
    const label = `Câu luyện ${index + 1}`;
    const problem = (message: string) => [
      { section: "questions" as const, itemId: question.id, message: `${label}: ${message}` },
    ];
    if (!isEditableQuestion(question)) {
      return questionSchema.safeParse(question).success ? [] : problem("dữ liệu chưa hợp lệ.");
    }
    if (blank(question.prompt)) {
      return problem("nhập đề bài.");
    }
    if (blank(question.explain)) {
      return problem("nhập giải thích đáp án.");
    }
    if (question.points < 1) {
      return problem("điểm là số nguyên từ 1 đến 100.");
    }
    if (question.type === "choice") {
      if (question.options.length < 2 || question.options.some(blank)) {
        return problem("cần ít nhất 2 lựa chọn và không để trống lựa chọn nào.");
      }
      if (
        !question.answer.length ||
        question.answer.some((answer) => answer >= question.options.length) ||
        new Set(question.answer).size !== question.answer.length
      ) {
        return problem("chọn đáp án đúng trong các lựa chọn.");
      }
      if (!question.multiple && question.answer.length !== 1) {
        return problem("câu một đáp án chỉ được có một lựa chọn đúng.");
      }
      return [];
    }
    const answers = question.answer.filter((answer) => !blank(answer));
    if (!answers.length) {
      return problem("nhập ít nhất một đáp án được chấp nhận.");
    }
    if (question.kanjiStrict && !answers.every(containsKanji)) {
      return problem("đã bật kanji bắt buộc nên mọi đáp án phải chứa kanji.");
    }
    return [];
  });
}

function describeSlideProblems(content: DraftContent): PublishProblem[] {
  if (!content.slides.length) {
    return [{ section: "slides", message: "Bài cần ít nhất một slide." }];
  }
  const vocabIds = new Set(content.vocab.map((item) => item.id));
  const grammarIds = new Set(content.grammar.map((item) => item.id));
  const quizIds = new Set(content.questions.filter(isEditableQuestion).map((item) => item.id));
  return content.slides.flatMap((slide, index): PublishProblem[] => {
    const problem = (message: string) => [
      { section: "slides" as const, itemId: slide.id, message: `Slide ${index + 1}: ${message}` },
    ];
    switch (slide.type) {
      case "title":
        return blank(slide.jp) || blank(slide.vi)
          ? problem("nhập dòng tiếng Nhật và tiếng Việt.")
          : [];
      case "vocab":
        if (!slide.refs.length) {
          return problem("chọn từ 1 đến 8 từ vựng.");
        }
        return slide.refs.every((ref) => vocabIds.has(ref)) &&
          new Set(slide.refs).size === slide.refs.length
          ? []
          : problem("có từ vựng không còn trong bài.");
      case "grammar":
      case "example":
        return grammarIds.has(slide.ref) ? [] : problem("chọn mẫu câu.");
      case "quiz":
        return quizIds.has(slide.ref) ? [] : problem("chọn câu luyện trắc nghiệm hoặc điền từ.");
      case "note":
        return blank(slide.title) || blank(slide.body)
          ? problem("nhập tiêu đề và nội dung ghi chú.")
          : [];
      case "image":
        if (!isAllowedMedia(slide.src.trim())) {
          return problem("đường dẫn ảnh phải là /đường-dẫn trong site hoặc https://.");
        }
        return blank(slide.alt) ? problem("nhập mô tả ảnh cho người không nhìn thấy.") : [];
    }
  });
}

// The result goes straight into the strict schema, so it stays untyped here.
function withoutBlankOptionals(item: object, keys: readonly string[]) {
  const copy: Record<string, unknown> = { ...item };
  for (const key of keys) {
    const value = copy[key];
    if (typeof value === "string" && blank(value)) {
      delete copy[key];
    }
  }
  return copy;
}

// Final strict contract shared with the import script and published snapshots.
export function toPublishableContent(content: DraftContent): LessonContent {
  return lessonContentSchema.parse({
    ...content,
    vocab: content.vocab.map((item) => withoutBlankOptionals(item, ["kanji", "note"])),
    grammar: content.grammar.map((item) => withoutBlankOptionals(item, ["viMistake"])),
    slides: content.slides.map((slide) =>
      withoutBlankOptionals(slide.type === "image" ? { ...slide, src: slide.src.trim() } : slide, [
        "teacherNotes",
        "caption",
      ]),
    ),
    questions: content.questions.map((question) =>
      question.type === "fill"
        ? { ...question, answer: question.answer.filter((answer) => !blank(answer)) }
        : question,
    ),
  });
}

export function findPublishProblems(state: LessonDraftState): PublishProblem[] {
  const problems = [
    ...describeMetadataProblems(state.metadata),
    ...describeVocabProblems(state.content),
    ...describeGrammarProblems(state.content),
    ...describeQuestionProblems(state.content),
    ...describeSlideProblems(state.content),
  ];
  if (!problems.length) {
    try {
      toPublishableContent(state.content);
    } catch {
      problems.push({
        section: "info",
        message: "Nội dung chưa khớp định dạng bài học. Kiểm tra lại các mục.",
      });
    }
  }
  return problems;
}

export function countMissingAudio(content: DraftContent) {
  return (
    content.vocab.filter((item) => !item.audio).length +
    content.grammar.flatMap((item) => item.examples).filter((example) => !example.audio).length
  );
}

export function listAudioHashes(content: DraftContent) {
  return [
    ...new Set(
      [
        ...content.vocab.map((item) => item.audio),
        ...content.grammar.flatMap((item) => item.examples.map((example) => example.audio)),
      ].filter((hash): hash is string => Boolean(hash)),
    ),
  ];
}
