import { z } from "zod";

import { typedAnswerKey } from "@/lib/grading/grade";
import {
  isBlankAnswer,
  parseChoiceSelection,
  parseTextAnswer,
  parseTokenOrder,
} from "@/lib/grading/raw-answer";
import { containsKanji } from "@/lib/japanese-text";
import { questionSchema } from "@/lib/lesson-schema";
import {
  MAX_ORDER_PIECE_LENGTH,
  MAX_ORDER_PIECES,
  MAX_PASSAGE_LENGTH,
  MIN_ORDER_PIECES,
} from "@/lib/order-pieces";

import type { RawAnswer } from "@/lib/grading/raw-answer";
import type { LessonQuestion } from "@/lib/lesson-schema";

export const MAX_ASSIGNMENT_QUESTIONS = 70;
export const MAX_ATTEMPTS = 10;
export const MAX_DRAFT_BYTES = 32 * 1024;

export const ASSIGNMENT_MODES = ["practice", "test"] as const;
export const FEEDBACK_POLICIES = ["after_submit", "after_due"] as const;
export const INPUT_MODES = [
  "hiragana",
  "katakana",
  "japanese",
  "chinese",
  "pinyin",
  "text",
] as const;

export type AssignmentMode = (typeof ASSIGNMENT_MODES)[number];
export type FeedbackPolicy = (typeof FEEDBACK_POLICIES)[number];
export type InputMode = (typeof INPUT_MODES)[number];
export type AssignableQuestion = Extract<
  LessonQuestion,
  { type: "choice" | "fill" | "listen" | "dictation" | "order" }
>;

const ASSIGNABLE_TYPES: readonly LessonQuestion["type"][] = [
  "choice",
  "fill",
  "listen",
  "dictation",
  "order",
];
export const MAX_RECORDED_LISTENS = 100;

// Matching stays gradable but has no learner screen yet, so it cannot be assigned.
export function isAssignableQuestion(question: LessonQuestion): question is AssignableQuestion {
  return ASSIGNABLE_TYPES.includes(question.type);
}

export function isListeningQuestion(
  question: Pick<LessonQuestion, "type">,
): question is Extract<LessonQuestion, { type: "listen" | "dictation" }> {
  return question.type === "listen" || question.type === "dictation";
}

// The options a checked practice answer marks as right; null for questions without options.
export function correctChoiceIndexes(question: AssignableQuestion): number[] | null {
  if (question.type === "choice") {
    return question.answer;
  }
  if (question.type === "listen" && question.responseType === "choice") {
    return question.answer.filter((item): item is number => typeof item === "number");
  }
  return null;
}

// Every token belongs in the sentence, so one arrangement is the whole answer.
function isTokenPermutation(tokens: readonly { id: string }[], answer: readonly string[]) {
  const ids = tokens.map((token) => token.id);
  return (
    new Set(ids).size === ids.length &&
    answer.length === ids.length &&
    new Set(answer).size === answer.length &&
    answer.every((id) => ids.includes(id))
  );
}

export const assignableQuestionSchema = questionSchema.superRefine((question, context) => {
  if (!isAssignableQuestion(question)) {
    context.addIssue({
      code: "custom",
      message: "Only choice, fill, listen, dictation and order questions can be assigned.",
    });
    return;
  }
  if (question.type === "order" && !isTokenPermutation(question.tokens, question.answer)) {
    context.addIssue({
      code: "custom",
      message: "An order answer must use every token exactly once.",
    });
  }
  if (
    (question.type === "fill" || question.type === "dictation") &&
    question.kanjiStrict &&
    !question.answer.every(containsKanji)
  ) {
    context.addIssue({
      code: "custom",
      message: "Kanji-strict answers must all contain the target kanji form.",
    });
  }
});

export function parseAssignableQuestion(value: unknown): AssignableQuestion {
  const question = assignableQuestionSchema.parse(value);
  if (!isAssignableQuestion(question)) {
    throw new Error("Only choice, fill, listen, dictation and order questions can be assigned.");
  }
  return question;
}

const kanjiStrictSnapshot = z
  .object({
    type: z.enum(["fill", "dictation"]),
    kanjiStrict: z.literal(true),
    answer: z.array(z.string()),
  })
  .loose();

// A snapshot also holds the typed answers a teacher accepted for its question, including one
// accepted before the question became kanji-strict. Reading leaves out those answers without
// kanji, which the question no longer takes, instead of failing the whole set for every learner.
export function parseSnapshotQuestion(value: unknown): AssignableQuestion {
  const strict = kanjiStrictSnapshot.safeParse(value);
  if (strict.success) {
    const kept = strict.data.answer.filter(containsKanji);
    if (kept.length && kept.length < strict.data.answer.length) {
      return parseAssignableQuestion({ ...strict.data, answer: kept });
    }
  }
  return parseAssignableQuestion(value);
}

const title = z.string().trim().min(1).max(160);

export const assignmentSettingsSchema = z
  .object({
    title,
    mode: z.enum(ASSIGNMENT_MODES),
    dueAt: z.iso.datetime({ offset: true }).nullable(),
    allowLate: z.boolean(),
    passScore: z.number().int().min(0).max(100),
    maxAttempts: z.number().int().min(1).max(MAX_ATTEMPTS),
    feedbackPolicy: z.enum(FEEDBACK_POLICIES),
  })
  .strict()
  .superRefine((settings, context) => {
    if (settings.mode === "practice" && settings.feedbackPolicy !== "after_submit") {
      context.addIssue({ code: "custom", message: "Practice feedback is shown after submit." });
    }
    if (settings.mode === "test" && settings.maxAttempts !== 1) {
      context.addIssue({ code: "custom", message: "Tests allow exactly one attempt." });
    }
    if (settings.feedbackPolicy === "after_due" && !settings.dueAt) {
      context.addIssue({ code: "custom", message: "After-due feedback needs a due date." });
    }
  });

const promptText = z.string().trim().min(1).max(500);
const optionText = z.string().trim().min(1).max(120);
const points = z.number().int().min(1).max(100);
const passageText = z.string().trim().min(1).max(MAX_PASSAGE_LENGTH).optional();
const pieceId = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/)
  .max(20);

export const testQuestionInputSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("choice"),
      passage: passageText,
      prompt: promptText,
      options: z.array(optionText).min(2).max(6),
      answer: z.array(z.number().int().nonnegative()).min(1),
      multiple: z.boolean(),
      explain: promptText,
      points,
    })
    .strict(),
  z
    .object({
      type: z.literal("fill"),
      passage: passageText,
      prompt: promptText,
      answer: z.array(optionText).min(1).max(10),
      inputMode: z.enum(INPUT_MODES),
      kanjiStrict: z.boolean(),
      explain: promptText,
      points,
    })
    .strict(),
  z
    .object({
      type: z.literal("order"),
      passage: passageText,
      prompt: promptText,
      tokens: z
        .array(
          z
            .object({
              id: pieceId,
              text: z.string().trim().min(1).max(MAX_ORDER_PIECE_LENGTH),
            })
            .strict(),
        )
        .min(MIN_ORDER_PIECES)
        .max(MAX_ORDER_PIECES)
        .refine(
          (tokens) => new Set(tokens.map((token) => token.text)).size === tokens.length,
          "Order pieces must differ.",
        ),
      answer: z.array(pieceId).max(MAX_ORDER_PIECES),
      explain: promptText,
      points,
    })
    .strict(),
]);

export type TestQuestionInput = z.infer<typeof testQuestionInputSchema>;

// Test questions get private IDs so they never collide with public practice questions.
// Fill questions follow their input mode (hiragana stays on the Japanese rules even in a Chinese
// class); Vietnamese text answers, choice and order questions follow the class language, which
// only affects display.
// The inputs come from the browser, so the authoring limits are checked here as well.
export function toTestQuestions(
  inputs: readonly TestQuestionInput[],
  languageTag = "ja-JP",
): AssignableQuestion[] {
  return z
    .array(testQuestionInputSchema)
    .parse(inputs)
    .map((input, index) => {
      const isChinese =
        input.type === "fill"
          ? input.inputMode === "chinese" ||
            input.inputMode === "pinyin" ||
            (input.inputMode === "text" && languageTag !== "ja-JP")
          : languageTag !== "ja-JP";
      return parseAssignableQuestion({
        ...input,
        id: `t${index + 1}`,
        tags: [],
        ...(isChinese ? { gradingProfile: "zh-exact-v1" } : {}),
      });
    });
}

interface ListeningFields {
  audio: string | null;
  maxListens: number | null;
}

// Chinese questions mix Vietnamese instructions with Chinese text, so they keep the page
// language and let the browser pick a Chinese font; Japanese questions stay lang="ja".
export type QuestionLang = "ja" | "vi";

export function questionLang(question: LessonQuestion): QuestionLang {
  return question.gradingProfile === "zh-exact-v1" ? "vi" : "ja";
}

// Lists that only know the class, such as the class report, follow the class language.
export function classQuestionLang(languageTag: string): QuestionLang {
  return languageTag === "ja-JP" ? "ja" : "vi";
}

// The language each input mode types, so typed answers shown later keep a matching font:
// Vietnamese, pinyin and Chinese answers are not drawn with the Japanese font.
export const INPUT_LANGS: Record<InputMode, string> = {
  text: "vi",
  chinese: "zh",
  pinyin: "zh-Latn-pinyin",
  hiragana: "ja",
  katakana: "ja",
  japanese: "ja",
};

export function answerLang(view: QuestionView) {
  return "inputMode" in view ? INPUT_LANGS[view.inputMode] : view.lang;
}

interface QuestionViewBase {
  id: string;
  prompt: string;
  points: number;
  lang: QuestionLang;
  // A reading passage shared by several questions, shown above the prompt.
  passage?: string;
  // The kind of exercise from the question's tags, such as "Đọc hiểu".
  section?: string;
}

export interface OrderToken {
  id: string;
  text: string;
}

export type QuestionView = QuestionViewBase &
  (
    | { type: "choice"; options: string[]; multiple: boolean }
    | { type: "fill"; inputMode: InputMode }
    | ({ type: "listen" } & ListeningFields &
        ({ responseType: "choice"; options: string[] } | { responseType: "fill" }))
    | ({ type: "dictation"; inputMode: InputMode } & ListeningFields)
    | { type: "order"; tokens: OrderToken[] }
  );

// Bank tags that name a kind of exercise, for Japanese and Chinese alike. Tags that already are
// one of these Vietnamese names (the Chinese template's "Từ vựng", a Sheet's "Ngữ pháp") show as
// they are; other lessons show no section.
const SECTION_LABELS: Record<string, string> = {
  kanji: "Kanji",
  hanzi: "Chữ Hán",
  writing: "Chữ Hán",
  pinyin: "Pinyin",
  tones: "Thanh điệu",
  vocabulary: "Từ vựng",
  meaning: "Nghĩa từ",
  "measure-words": "Lượng từ",
  forms: "Biến đổi từ",
  particles: "Trợ từ",
  grammar: "Ngữ pháp",
  paraphrase: "Câu cùng nghĩa",
  "sentence-order": "Sắp xếp câu",
  reading: "Đọc hiểu",
  listening: "Nghe",
};
const SECTION_NAMES = new Set(Object.values(SECTION_LABELS));

export function questionSection(tags: readonly string[]) {
  for (const tag of tags) {
    const label = SECTION_LABELS[tag] ?? (SECTION_NAMES.has(tag) ? tag : undefined);
    if (label) {
      return label;
    }
  }
  return undefined;
}

function hashText(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619) >>> 0;
  }
  return hash;
}

// Authors often list tokens in sentence order, so learners get them in a fixed shuffle that is
// never the answer itself.
export function shuffleOrderTokens(
  questionId: string,
  tokens: readonly OrderToken[],
  answer: readonly string[],
) {
  const shuffled = [...tokens].sort(
    (first, second) =>
      hashText(`${questionId}:${first.id}`) - hashText(`${questionId}:${second.id}`),
  );
  const isAnswerOrder = shuffled.every((token, index) => token.id === answer[index]);
  return isAnswerOrder && shuffled.length > 1 ? [...shuffled.slice(1), shuffled[0]] : shuffled;
}

// Japanese and Chinese sentences join without spaces; Latin-script tokens keep them.
export function joinOrderTokens(texts: readonly string[]) {
  return texts.some((text) => /[A-Za-zÀ-ỹ]/.test(text)) ? texts.join(" ") : texts.join("");
}

function orderTokenTexts(tokens: readonly OrderToken[], ids: readonly string[]) {
  return ids
    .map((id) => tokens.find((token) => token.id === id)?.text)
    .filter((text): text is string => text !== undefined);
}

// Allowlist for anything sent to a learner before feedback is permitted: no answers,
// explanations or transcripts.
export function toQuestionView(question: AssignableQuestion): QuestionView {
  const section = questionSection(question.tags);
  const base = {
    id: question.id,
    prompt: question.prompt,
    points: question.points,
    lang: questionLang(question),
    ...(question.passage ? { passage: question.passage } : {}),
    ...(section ? { section } : {}),
  };
  switch (question.type) {
    case "choice":
      return { ...base, type: "choice", options: question.options, multiple: question.multiple };
    case "fill":
      return { ...base, type: "fill", inputMode: question.inputMode };
    case "listen": {
      const listening = { audio: question.audio, maxListens: question.maxListens };
      return question.responseType === "choice"
        ? {
            ...base,
            ...listening,
            type: "listen",
            responseType: "choice",
            options: question.options ?? [],
          }
        : { ...base, ...listening, type: "listen", responseType: "fill" };
    }
    case "dictation":
      return {
        ...base,
        type: "dictation",
        inputMode: question.inputMode,
        audio: question.audio,
        maxListens: question.maxListens,
      };
    case "order":
      return {
        ...base,
        type: "order",
        tokens: shuffleOrderTokens(question.id, question.tokens, question.answer),
      };
  }
}

export interface AttemptItem {
  view: QuestionView;
  // Present only for practice, where immediate client feedback is intended.
  answerKey: AssignableQuestion | null;
}

export function toAttemptItems(
  questions: readonly AssignableQuestion[],
  mode: AssignmentMode,
): AttemptItem[] {
  return questions.map((question) => ({
    view: toQuestionView(question),
    answerKey: mode === "practice" ? question : null,
  }));
}

export interface FeedbackRule {
  feedbackPolicy: FeedbackPolicy;
  dueAt: string | null;
}

export function hasFeedbackTimeArrived(rule: FeedbackRule, now: Date) {
  return (
    rule.feedbackPolicy === "after_submit" ||
    (rule.dueAt !== null && now.getTime() >= Date.parse(rule.dueAt))
  );
}

export function isFeedbackAvailable(rule: FeedbackRule, submittedAt: string | null, now: Date) {
  return submittedAt !== null && hasFeedbackTimeArrived(rule, now);
}

// The morning job hands in an attempt left open past its deadline as of the deadline itself
// (migration 20261105012503); a learner's own submit is stamped with the moment it arrived.
export function isHandedInAtDeadline(submittedAt: string | null, dueAt: string | null) {
  return submittedAt !== null && dueAt !== null && Date.parse(submittedAt) === Date.parse(dueAt);
}

export type DeadlineState = "no_deadline" | "on_time" | "late" | "past_due";

// Submitting exactly at the deadline is on time; later submissions are late when allowed.
// Work still on time comes first, soonest deadline first, then work without a deadline;
// overdue work that still accepts late submissions follows, most recent first, so missed
// daily practice never hides today's.
export function compareDueUrgency(first: string | null, second: string | null, now: Date) {
  const firstDue = first ? Date.parse(first) : Infinity;
  const secondDue = second ? Date.parse(second) : Infinity;
  const isFirstOverdue = firstDue < now.getTime();
  const isSecondOverdue = secondDue < now.getTime();
  if (isFirstOverdue !== isSecondOverdue) {
    return isFirstOverdue ? 1 : -1;
  }
  if (firstDue === secondDue) {
    return 0;
  }
  if (isFirstOverdue) {
    return secondDue - firstDue;
  }
  return firstDue < secondDue ? -1 : 1;
}

export function getDeadlineState(
  dueAt: string | null,
  allowLate: boolean,
  now: Date,
): DeadlineState {
  if (!dueAt) {
    return "no_deadline";
  }
  if (now.getTime() <= Date.parse(dueAt)) {
    return "on_time";
  }
  return allowLate ? "late" : "past_due";
}

export interface AttemptDraft {
  answers: Record<string, RawAnswer>;
  checked: string[];
  // Client-observed plays per listening question; never used to decide pass or fail.
  listens: Record<string, number>;
}

export const EMPTY_DRAFT: AttemptDraft = { answers: {}, checked: [], listens: {} };

const draftEnvelopeSchema = z
  .object({
    answers: z.record(z.string(), z.unknown()),
    checked: z.array(z.string()).default([]),
    listens: z.record(z.string(), z.number().int().min(0).max(MAX_RECORDED_LISTENS)).default({}),
  })
  .strict();

export function parseViewAnswer(view: QuestionView, value: unknown): RawAnswer {
  if (view.type === "choice") {
    return parseChoiceSelection(view.options.length, view.multiple, value);
  }
  if (view.type === "listen" && view.responseType === "choice") {
    return parseChoiceSelection(view.options.length, false, value);
  }
  if (view.type === "order") {
    return parseTokenOrder(
      view.tokens.map((token) => token.id),
      value,
    );
  }
  return parseTextAnswer(value);
}

// Validates draft shape against the learner-visible view, so the same check runs in the
// browser (where test answer keys are absent) and on the server.
export function parseAttemptDraft(views: readonly QuestionView[], value: unknown): AttemptDraft {
  if (new TextEncoder().encode(JSON.stringify(value ?? null)).length > MAX_DRAFT_BYTES) {
    throw new Error("Draft is too large.");
  }
  const envelope = draftEnvelopeSchema.parse(value);
  const answers: Record<string, RawAnswer> = {};
  for (const [questionId, raw] of Object.entries(envelope.answers)) {
    const view = views.find((item) => item.id === questionId);
    if (!view) {
      throw new Error("Draft refers to an unknown question.");
    }
    const parsed = parseViewAnswer(view, raw);
    if (!isBlankAnswer(parsed)) {
      answers[questionId] = parsed;
    }
  }
  const checked = [...new Set(envelope.checked)];
  if (checked.some((questionId) => !views.some((item) => item.id === questionId))) {
    throw new Error("Draft marks an unknown question as checked.");
  }
  const listeningIds = views.filter(isListeningQuestion).map((view) => view.id);
  if (Object.keys(envelope.listens).some((questionId) => !listeningIds.includes(questionId))) {
    throw new Error("Draft counts plays for a question without audio.");
  }
  return { answers, checked, listens: envelope.listens };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([first], [second]) => first.localeCompare(second));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Compares drafts after the normalization the server applies; key order is ignored because
// the database does not keep it.
export function isSameAttemptDraft(
  views: readonly QuestionView[],
  first: unknown,
  second: unknown,
) {
  try {
    return (
      canonicalJson(parseAttemptDraft(views, first)) ===
      canonicalJson(parseAttemptDraft(views, second))
    );
  } catch {
    return false;
  }
}

export function countBlankAnswers(views: readonly QuestionView[], draft: AttemptDraft) {
  return views.filter((view) => isBlankAnswer(draft.answers[view.id])).length;
}

// A multiple-choice answer needs every listed option, so they are joined with "+" rather than the
// "/" that separates alternative typed answers ("A / B" would read as "A or B").
function choiceSeparator(question: AssignableQuestion) {
  return question.type === "choice" && question.multiple ? " + " : " / ";
}

export function describeCorrectAnswer(question: AssignableQuestion) {
  if (
    question.type === "choice" ||
    (question.type === "listen" && question.responseType === "choice")
  ) {
    const options = question.options ?? [];
    return question.answer
      .map((answer) => (typeof answer === "number" ? options[answer] : answer))
      .join(choiceSeparator(question));
  }
  if (question.type === "order") {
    return joinOrderTokens(orderTokenTexts(question.tokens, question.answer));
  }
  // "わたしはがくせいです。" and "わたしはがくせいです" grade the same, so only the first is shown.
  const shown = new Set<string>();
  return question.answer
    .map(String)
    .filter((answer) => {
      const key = typedAnswerKey(question, answer);
      if (shown.has(key)) {
        return false;
      }
      shown.add(key);
      return true;
    })
    .join(" / ");
}

// Stored answers are JSON; anything outside the known raw shapes is treated as blank.
export function toStoredRawAnswer(value: unknown): RawAnswer | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return value;
  }
  // An order answer is the list of token IDs in the learner's order.
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }
  return null;
}

export function describeRawAnswer(question: AssignableQuestion, raw: RawAnswer | null) {
  if (raw === null || isBlankAnswer(raw)) {
    return "";
  }
  if (question.type === "order") {
    const ids = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
    return joinOrderTokens(orderTokenTexts(question.tokens, ids));
  }
  const isChoice =
    question.type === "choice" ||
    (question.type === "listen" && question.responseType === "choice");
  if (!isChoice) {
    return typeof raw === "string" ? raw : "";
  }
  if (!Array.isArray(raw)) {
    return "";
  }
  const options = question.options ?? [];
  return raw
    .map((index) => (typeof index === "number" ? options[index] : undefined))
    .filter((option): option is string => option !== undefined)
    .join(choiceSeparator(question));
}

// The last hour before a deadline shows a countdown on the submit bar; the last ten minutes
// stand out. When late work is refused the attempt submits itself a minute early, because the
// server rejects anything that arrives after the deadline.
export const COUNTDOWN_WINDOW_MS = 60 * 60 * 1000;
export const COUNTDOWN_URGENT_MS = 10 * 60 * 1000;
export const AUTO_SUBMIT_LEAD_MS = 60 * 1000;

export function describeTimeLeft(dueAt: string | null, allowLate: boolean, now: number) {
  if (!dueAt) {
    return null;
  }
  const left = Date.parse(dueAt) - now;
  if (left <= 0 || left > COUNTDOWN_WINDOW_MS) {
    return null;
  }
  const totalSeconds = Math.ceil(left / 1000);
  const clock = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
  return {
    text: allowLate
      ? `Còn ${clock} tới hạn; nộp sau đó sẽ ghi là nộp muộn.`
      : `Còn ${clock} tới hạn. Bài tự nộp khi còn 1 phút.`,
    isUrgent: left <= COUNTDOWN_URGENT_MS,
    shouldAutoSubmit: !allowLate && left <= AUTO_SUBMIT_LEAD_MS,
  };
}
