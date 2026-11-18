import { z } from "zod";

import type { LessonQuestion } from "@/lib/lesson-schema";

export const LIVE_QUESTION_COUNTS = [5, 10, 15] as const;
export const LIVE_SECONDS = [10, 20, 30] as const;
export const LIVE_PHASES = ["lobby", "question", "reveal", "finished"] as const;
export type LivePhase = (typeof LIVE_PHASES)[number];
export const LIVE_ACTIONS = ["start", "reveal", "next", "finish"] as const;
export type LiveAction = (typeof LIVE_ACTIONS)[number];
// Phones ask this often; the shared screen a little more often so the count of answers moves.
export const LIVE_PLAYER_POLL_MS = 1500;
export const LIVE_HOST_POLL_MS = 1000;
const MAX_OPTIONS = 6;

// What the round keeps of a question: the key stays on the server until the answer is shown.
export const liveQuestionSchema = z.object({
  id: z.string(),
  instruction: z.string().optional(),
  prompt: z.string(),
  options: z.array(z.string()).min(2).max(MAX_OPTIONS),
  answer: z.number().int().nonnegative(),
  explain: z.string(),
});
export type LiveQuestion = z.infer<typeof liveQuestionSchema>;

// One tap answers on a phone in a few seconds: single-choice questions without a passage, a
// picture or a recording, and with few enough options to show as big buttons.
export function toLiveQuestion(question: LessonQuestion): LiveQuestion | null {
  if (
    question.type !== "choice" ||
    question.multiple ||
    question.answer.length !== 1 ||
    question.passage ||
    question.image ||
    question.options.length > MAX_OPTIONS
  ) {
    return null;
  }
  return {
    id: question.id,
    ...(question.instruction ? { instruction: question.instruction } : {}),
    prompt: question.prompt,
    options: question.options,
    answer: question.answer[0],
    explain: question.explain,
  };
}

// A different draw for each round, spread over the lesson, then shown in lesson order so the
// round follows the order the class learned the points in.
export function pickLiveQuestions(
  questions: readonly LessonQuestion[],
  count: number,
  random: () => number = Math.random,
) {
  const eligible = questions.flatMap((question) => toLiveQuestion(question) ?? []);
  const take = Math.min(count, eligible.length);
  const picked = new Set<number>();
  for (let slot = 0; slot < take; slot++) {
    // One question from each equal stretch of the lesson.
    const start = Math.floor((slot * eligible.length) / take);
    const end = Math.floor(((slot + 1) * eligible.length) / take);
    picked.add(start + Math.floor(random() * (end - start)));
  }
  return [...picked].sort((first, second) => first - second).map((index) => eligible[index]);
}

export interface LiveAnswerRow {
  userId: string;
  questionIndex: number;
  choice: number;
  isCorrect: boolean;
  points: number;
}

export interface LivePlayerRow {
  userId: string;
  name: string;
  joinedAt: string;
}

export interface LiveStanding {
  userId: string;
  name: string;
  points: number;
  correct: number;
  rank: number;
}

// Points first, then right answers; equal scores share a rank (1, 2, 2, 4).
export function rankLivePlayers(
  players: readonly LivePlayerRow[],
  answers: readonly LiveAnswerRow[],
): LiveStanding[] {
  const totals = new Map(players.map((player) => [player.userId, { points: 0, correct: 0 }]));
  for (const answer of answers) {
    const total = totals.get(answer.userId);
    if (total) {
      total.points += answer.points;
      total.correct += answer.isCorrect ? 1 : 0;
    }
  }
  const sorted = players
    .map((player) => ({
      userId: player.userId,
      name: player.name,
      ...(totals.get(player.userId) ?? { points: 0, correct: 0 }),
    }))
    .sort(
      (first, second) =>
        second.points - first.points ||
        second.correct - first.correct ||
        first.name.localeCompare(second.name, "vi"),
    );
  return sorted.map((standing, index) => {
    const firstEqual = sorted.findIndex(
      (other) => other.points === standing.points && other.correct === standing.correct,
    );
    return { ...standing, rank: (firstEqual === -1 ? index : firstEqual) + 1 };
  });
}

// How many picked each option, for the bars shown with the answer.
export function countLiveChoices(
  answers: readonly LiveAnswerRow[],
  questionIndex: number,
  optionCount: number,
) {
  const counts = Array.from({ length: optionCount }, () => 0);
  for (const answer of answers) {
    if (answer.questionIndex === questionIndex && answer.choice < optionCount) {
      counts[answer.choice] += 1;
    }
  }
  return counts;
}

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
