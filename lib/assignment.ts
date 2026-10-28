import { z } from "zod";

import { isBlankAnswer, parseChoiceSelection, parseTextAnswer } from "@/lib/grading/raw-answer";
import { questionSchema } from "@/lib/lesson-schema";

import type { RawAnswer } from "@/lib/grading/raw-answer";
import type { LessonQuestion } from "@/lib/lesson-schema";

export const MAX_ASSIGNMENT_QUESTIONS = 50;
export const MAX_ATTEMPTS = 10;
export const MAX_DRAFT_BYTES = 32 * 1024;

export const ASSIGNMENT_MODES = ["practice", "test"] as const;
export const FEEDBACK_POLICIES = ["after_submit", "after_due"] as const;
export const INPUT_MODES = ["hiragana", "katakana", "japanese"] as const;

export type AssignmentMode = (typeof ASSIGNMENT_MODES)[number];
export type FeedbackPolicy = (typeof FEEDBACK_POLICIES)[number];
export type InputMode = (typeof INPUT_MODES)[number];
export type AssignableQuestion = Extract<LessonQuestion, { type: "choice" | "fill" }>;

// Phase 3 screens render choice and fill only; other types stay gradable but cannot be assigned.
export function isAssignableQuestion(question: LessonQuestion): question is AssignableQuestion {
  return question.type === "choice" || question.type === "fill";
}

const containsKanji = (value: string) => /\p{Script=Han}/u.test(value);

export const assignableQuestionSchema = questionSchema.superRefine((question, context) => {
  if (!isAssignableQuestion(question)) {
    context.addIssue({
      code: "custom",
      message: "Only choice and fill questions can be assigned.",
    });
    return;
  }
  if (question.type === "fill" && question.kanjiStrict && !question.answer.every(containsKanji)) {
    context.addIssue({
      code: "custom",
      message: "Kanji-strict answers must all contain the target kanji form.",
    });
  }
});

export function parseAssignableQuestion(value: unknown): AssignableQuestion {
  const question = assignableQuestionSchema.parse(value);
  if (!isAssignableQuestion(question)) {
    throw new Error("Only choice and fill questions can be assigned.");
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
export function toTestQuestions(inputs: readonly TestQuestionInput[]): AssignableQuestion[] {
  return inputs.map((input, index) =>
    parseAssignableQuestion({ ...input, id: `t${index + 1}`, tags: [] }),
  );
}

export type QuestionView =
  | {
      id: string;
      type: "choice";
      prompt: string;
      points: number;
      options: string[];
      multiple: boolean;
    }
  | { id: string; type: "fill"; prompt: string; points: number; inputMode: InputMode };

// Allowlist for anything sent to a learner before feedback is permitted.
export function toQuestionView(question: AssignableQuestion): QuestionView {
  if (question.type === "choice") {
    return {
      id: question.id,
      type: "choice",
      prompt: question.prompt,
      points: question.points,
      options: question.options,
      multiple: question.multiple,
    };
  }
  return {
    id: question.id,
    type: "fill",
    prompt: question.prompt,
    points: question.points,
    inputMode: question.inputMode,
  };
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
}

export const EMPTY_DRAFT: AttemptDraft = { answers: {}, checked: [] };

const draftEnvelopeSchema = z
  .object({
    answers: z.record(z.string(), z.unknown()),
    checked: z.array(z.string()).default([]),
  })
  .strict();

function parseViewAnswer(view: QuestionView, value: unknown): RawAnswer {
  return view.type === "choice"
    ? parseChoiceSelection(view.options.length, view.multiple, value)
    : parseTextAnswer(value);
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
  return { answers, checked };
}

export function countBlankAnswers(views: readonly QuestionView[], draft: AttemptDraft) {
  return views.filter((view) => isBlankAnswer(draft.answers[view.id])).length;
}

export function describeCorrectAnswer(question: AssignableQuestion) {
  return question.type === "choice"
    ? question.answer.map((index) => question.options[index]).join(" / ")
    : question.answer.join(" / ");
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
  if (question.type === "fill") {
    return typeof raw === "string" ? raw : "";
  }
  if (!Array.isArray(raw)) {
    return "";
  }
  return raw
    .map((index) => (typeof index === "number" ? question.options[index] : undefined))
    .filter((option): option is string => option !== undefined)
    .join(" / ");
}
