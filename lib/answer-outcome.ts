import { z } from "zod";

// Answer lists of a graded attempt can be narrowed to the wrong or the right answers.
export const answerOutcomeSchema = z.enum(["wrong", "correct"]);

export type AnswerOutcome = z.infer<typeof answerOutcomeSchema>;

export const ANSWER_OUTCOME_LABELS: Record<AnswerOutcome, string> = {
  wrong: "Sai",
  correct: "Đúng",
};

// An unknown or repeated query value shows everything instead of failing the page.
export function parseAnswerOutcome(value: unknown) {
  const parsed = answerOutcomeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function matchesOutcome(isCorrect: boolean, outcome: AnswerOutcome | undefined) {
  return !outcome || (outcome === "correct") === isCorrect;
}

// Question numbers stay those of the whole attempt when only some answers are shown.
export function numberAnswers<Item>(items: readonly Item[]) {
  return items.map((item, index) => ({ item, number: index + 1 }));
}

export function countOutcomes(items: readonly { isCorrect: boolean }[]) {
  const correct = items.filter((item) => item.isCorrect).length;
  return { all: items.length, correct, wrong: items.length - correct };
}

export function outcomeHref(path: string, outcome: AnswerOutcome | undefined) {
  return outcome ? `${path}?outcome=${outcome}` : path;
}
