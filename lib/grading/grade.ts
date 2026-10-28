import { normalizeAnswer } from "./normalize";
import { isBlankAnswer } from "./raw-answer";

import type { RawAnswer } from "./raw-answer";
import type { LessonQuestion } from "@/lib/lesson-schema";

export interface QuestionResult {
  questionId: string;
  raw: RawAnswer | null;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface AttemptGrade {
  results: QuestionResult[];
  score: number;
  maxScore: number;
}

function isIndexList(raw: RawAnswer): raw is number[] {
  return Array.isArray(raw) && raw.every((item) => typeof item === "number");
}

function isPairList(raw: RawAnswer): raw is [number, number][] {
  return Array.isArray(raw) && raw.every((item) => Array.isArray(item));
}

function isTokenList(raw: RawAnswer): raw is string[] {
  return Array.isArray(raw) && raw.every((item) => typeof item === "string");
}

function matchesChoice(accepted: readonly number[], raw: RawAnswer) {
  return (
    isIndexList(raw) &&
    raw.length === accepted.length &&
    new Set(raw).size === raw.length &&
    raw.every((index) => accepted.includes(index))
  );
}

function matchesText(accepted: readonly string[], raw: RawAnswer) {
  if (typeof raw !== "string") {
    return false;
  }
  const normalized = normalizeAnswer(raw);
  return normalized !== "" && accepted.some((answer) => normalizeAnswer(answer) === normalized);
}

function matchesPairs(accepted: readonly [number, number][], raw: RawAnswer) {
  return (
    isPairList(raw) &&
    raw.length === accepted.length &&
    accepted.every(([left, right]) =>
      raw.some(([rawLeft, rawRight]) => rawLeft === left && rawRight === right),
    )
  );
}

function matchesOrder(accepted: readonly string[], raw: RawAnswer) {
  return (
    isTokenList(raw) &&
    raw.length === accepted.length &&
    raw.every((id, position) => id === accepted[position])
  );
}

// One grader per question type; a new type adds a case without touching existing rules.
function isCorrectAnswer(question: LessonQuestion, raw: RawAnswer) {
  switch (question.type) {
    case "choice":
      return matchesChoice(question.answer, raw);
    case "fill":
    case "dictation":
      return matchesText(question.answer, raw);
    case "match":
      return matchesPairs(question.answer, raw);
    case "order":
      return matchesOrder(question.answer, raw);
    case "listen":
      return question.responseType === "choice"
        ? matchesChoice(
            question.answer.filter((item): item is number => typeof item === "number"),
            raw,
          )
        : matchesText(
            question.answer.filter((item): item is string => typeof item === "string"),
            raw,
          );
  }
}

export function gradeQuestion(question: LessonQuestion, raw: RawAnswer | undefined) {
  const isCorrect = raw !== undefined && !isBlankAnswer(raw) && isCorrectAnswer(question, raw);
  return { isCorrect, pointsEarned: isCorrect ? question.points : 0 };
}

export function gradeAttempt(
  questions: readonly LessonQuestion[],
  answers: Readonly<Record<string, RawAnswer>>,
): AttemptGrade {
  const results = questions.map((question) => {
    const raw = answers[question.id];
    return { questionId: question.id, raw: raw ?? null, ...gradeQuestion(question, raw) };
  });
  const maxScore = questions.reduce((total, question) => total + question.points, 0);
  if (maxScore <= 0) {
    throw new Error("An attempt needs a positive maximum score.");
  }
  return {
    results,
    score: results.reduce((total, result) => total + result.pointsEarned, 0),
    maxScore,
  };
}

// Pass decisions use exact integer arithmetic; only displayed percentages are rounded.
export function isPassingScore(score: number, maxScore: number, passScore: number) {
  return score * 100 >= passScore * maxScore;
}

export function toPercent(score: number, maxScore: number) {
  return (score / maxScore) * 100;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}
