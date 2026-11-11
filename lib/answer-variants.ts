import { parseAssignableQuestion, toStoredRawAnswer } from "@/lib/assignment";
import { gradeQuestion } from "@/lib/grading/grade";

import type { AssignableQuestion } from "@/lib/assignment";

const MAX_VARIANT_LENGTH = 200;

// Only a typed answer can be accepted afterwards; choices and sentence order have no free text.
export function isTypedQuestion(question: { type: string; responseType?: string }) {
  return (
    question.type === "fill" ||
    question.type === "dictation" ||
    (question.type === "listen" && question.responseType === "fill")
  );
}

// The learner's text without surrounding spaces, or null when there is nothing to accept.
export function toAcceptedVariant(raw: unknown) {
  const value = toStoredRawAnswer(raw);
  if (typeof value !== "string") {
    return null;
  }
  const variant = value.trim();
  return variant && variant.length <= MAX_VARIANT_LENGTH ? variant : null;
}

// The question with the accepted answer added. It throws when the question cannot take it,
// such as a kanji-strict question and an answer without kanji.
function withAcceptedAnswer(question: AssignableQuestion, variant: string) {
  if (!isTypedQuestion(question) || question.type === "choice" || question.type === "order") {
    throw new Error("Only typed answers can be accepted.");
  }
  return parseAssignableQuestion({ ...question, answer: [...question.answer, variant] });
}

// Wrong answers the grader accepts once the variant is an answer: the same grading rules decide,
// so an answer written with other spacing or a final period counts as the teacher expects.
export function findRegradedSubmissions(
  question: AssignableQuestion,
  variant: string,
  rows: readonly { submission_id: string; raw: unknown }[],
) {
  const accepted = withAcceptedAnswer(question, variant);
  return rows
    .filter((row) => {
      const raw = toStoredRawAnswer(row.raw);
      return raw !== null && gradeQuestion(accepted, raw).isCorrect;
    })
    .map((row) => row.submission_id);
}
