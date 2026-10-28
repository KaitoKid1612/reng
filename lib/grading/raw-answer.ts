import { z } from "zod";

import type { LessonQuestion } from "@/lib/lesson-schema";

export const MAX_TEXT_ANSWER_LENGTH = 200;

const index = z.number().int().nonnegative();
const textAnswer = z.string().max(MAX_TEXT_ANSWER_LENGTH);

export function parseTextAnswer(value: unknown) {
  return textAnswer.parse(value);
}

export type RawAnswer = string | number[] | string[] | [number, number][];

function hasUniqueValues(values: readonly (number | string)[]) {
  return new Set(values).size === values.length;
}

export function parseChoiceSelection(optionCount: number, isMultiple: boolean, value: unknown) {
  const selection = z
    .array(index)
    .max(optionCount)
    .refine(hasUniqueValues, "Choices must be unique.")
    .refine((items) => items.every((item) => item < optionCount), "Choice is out of range.")
    .refine((items) => isMultiple || items.length <= 1, "Only one choice is allowed.")
    .parse(value);
  return [...selection].sort((first, second) => first - second);
}

function parseMatch(leftCount: number, rightCount: number, value: unknown) {
  const pairs = z
    .array(z.tuple([index, index]))
    .max(leftCount)
    .parse(value);
  const leftIndices = pairs.map(([left]) => left);
  const rightIndices = pairs.map(([, right]) => right);
  if (
    !hasUniqueValues(leftIndices) ||
    !hasUniqueValues(rightIndices) ||
    pairs.some(([left, right]) => left >= leftCount || right >= rightCount)
  ) {
    throw new Error("Matching pairs must be unique and in range.");
  }
  return pairs;
}

function parseOrder(tokenIds: readonly string[], value: unknown) {
  const order = z.array(z.string()).max(tokenIds.length).parse(value);
  if (!hasUniqueValues(order) || order.some((id) => !tokenIds.includes(id))) {
    throw new Error("Order answers must use each known token at most once.");
  }
  return order;
}

// Validates untrusted input for one question type and returns a canonical raw answer.
export function parseRawAnswer(question: LessonQuestion, value: unknown): RawAnswer {
  switch (question.type) {
    case "choice":
      return parseChoiceSelection(question.options.length, question.multiple, value);
    case "fill":
    case "dictation":
      return textAnswer.parse(value);
    case "match":
      return parseMatch(question.left.length, question.right.length, value);
    case "order":
      return parseOrder(
        question.tokens.map((token) => token.id),
        value,
      );
    case "listen":
      return question.responseType === "choice"
        ? parseChoiceSelection(question.options?.length ?? 0, false, value)
        : textAnswer.parse(value);
  }
}

export function isBlankAnswer(raw: RawAnswer | undefined) {
  if (raw === undefined) {
    return true;
  }
  return typeof raw === "string" ? raw.trim() === "" : raw.length === 0;
}
