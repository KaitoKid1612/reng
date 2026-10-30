import { z } from "zod";

import { isBlankAnswer, parseChoiceSelection, parseTextAnswer } from "@/lib/grading/raw-answer";
import { questionSchema } from "@/lib/lesson-schema";

import type { RawAnswer } from "@/lib/grading/raw-answer";
import type { LessonQuestion } from "@/lib/lesson-schema";

export const MAX_ASSIGNMENT_QUESTIONS = 60;
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
  { type: "choice" | "fill" | "listen" | "dictation" }
>;

const ASSIGNABLE_TYPES: readonly LessonQuestion["type"][] = [
  "choice",
  "fill",
  "listen",
  "dictation",
];
export const MAX_RECORDED_LISTENS = 100;

// Matching and ordering stay gradable but have no learner screen yet, so they cannot be assigned.
export function isAssignableQuestion(question: LessonQuestion): question is AssignableQuestion {
  return ASSIGNABLE_TYPES.includes(question.type);
}

export function isListeningQuestion(
  question: Pick<LessonQuestion, "type">,
): question is Extract<LessonQuestion, { type: "listen" | "dictation" }> {
  return question.type === "listen" || question.type === "dictation";
}

const containsKanji = (value: string) => /\p{Script=Han}/u.test(value);

export const assignableQuestionSchema = questionSchema.superRefine((question, context) => {
  if (!isAssignableQuestion(question)) {
    context.addIssue({
      code: "custom",
      message: "Only choice, fill, listen and dictation questions can be assigned.",
    });
    return;
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
    throw new Error("Only choice, fill, listen and dictation questions can be assigned.");
  }
  return question;
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

export const testQuestionInputSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("choice"),
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
      prompt: promptText,
      answer: z.array(optionText).min(1).max(10),
      inputMode: z.enum(INPUT_MODES),
      kanjiStrict: z.boolean(),
      explain: promptText,
      points,
    })
    .strict(),
]);

export type TestQuestionInput = z.infer<typeof testQuestionInputSchema>;

// Test questions get private IDs so they never collide with public practice questions.
// Fill questions follow their input mode (hiragana stays on the Japanese rules even in a Chinese
// class); choice questions follow the class language, which only affects display.
export function toTestQuestions(
  inputs: readonly TestQuestionInput[],
  languageTag = "ja-JP",
): AssignableQuestion[] {
  return inputs.map((input, index) => {
    const isChinese =
      input.type === "fill"
        ? input.inputMode === "chinese" || input.inputMode === "pinyin"
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

export type QuestionView =
  | {
      id: string;
      type: "choice";
      prompt: string;
      points: number;
      lang: QuestionLang;
      options: string[];
      multiple: boolean;
    }
  | {
      id: string;
      type: "fill";
      prompt: string;
      points: number;
      lang: QuestionLang;
      inputMode: InputMode;
    }
  | ({
      id: string;
      type: "listen";
      prompt: string;
      points: number;
      lang: QuestionLang;
    } & ListeningFields &
      ({ responseType: "choice"; options: string[] } | { responseType: "fill" }))
  | ({
      id: string;
      type: "dictation";
      prompt: string;
      points: number;
      lang: QuestionLang;
      inputMode: InputMode;
    } & ListeningFields);

// Allowlist for anything sent to a learner before feedback is permitted: no answers,
// explanations or transcripts.
export function toQuestionView(question: AssignableQuestion): QuestionView {
  const base = {
    id: question.id,
    prompt: question.prompt,
    points: question.points,
    lang: questionLang(question),
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

export function describeCorrectAnswer(question: AssignableQuestion) {
  if (
    question.type === "choice" ||
    (question.type === "listen" && question.responseType === "choice")
  ) {
    const options = question.options ?? [];
    return question.answer
      .map((answer) => (typeof answer === "number" ? options[answer] : answer))
      .join(" / ");
  }
  return question.answer.join(" / ");
}

// Stored answers are JSON; anything outside the known raw shapes is treated as blank.
export function toStoredRawAnswer(value: unknown): RawAnswer | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return value;
  }
  return null;
}

export function describeRawAnswer(question: AssignableQuestion, raw: RawAnswer | null) {
  if (raw === null || isBlankAnswer(raw)) {
    return "";
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
    .join(" / ");
}
