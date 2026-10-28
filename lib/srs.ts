import { createEmptyCard, fsrs, generatorParameters, Rating, State } from "ts-fsrs";
import { z } from "zod";

import type { Card, Grade } from "ts-fsrs";

// Stored with every card; a different value must be migrated explicitly, never guessed.
export const SCHEDULER_VERSION = "ts-fsrs-5.4.2";
export const MISTAKE_RESOLVE_STREAK = 3;
export const REVIEW_RATINGS = [1, 2, 3, 4] as const;
export const REVIEW_RATING_LABELS: Record<ReviewRating, string> = {
  1: "Quên",
  2: "Khó",
  3: "Được",
  4: "Dễ",
};

export type ReviewRating = (typeof REVIEW_RATINGS)[number];

const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));
const timestamp = z.iso.datetime({ offset: true });

export const schedulerStateSchema = z
  .object({
    due: timestamp,
    stability: z.number().nonnegative(),
    difficulty: z.number().nonnegative(),
    elapsed_days: z.number().int().nonnegative(),
    scheduled_days: z.number().int().nonnegative(),
    learning_steps: z.number().int().nonnegative(),
    reps: z.number().int().nonnegative(),
    lapses: z.number().int().nonnegative(),
    state: z.enum(State),
    last_review: timestamp.optional(),
  })
  .strict();

export type SchedulerState = z.infer<typeof schedulerStateSchema>;

function toSchedulerState(card: Card): SchedulerState {
  return schedulerStateSchema.parse({
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.toISOString(),
  });
}

function toCard(state: SchedulerState): Card {
  return {
    ...state,
    due: new Date(state.due),
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  };
}

export function parseSchedulerState(version: string, value: unknown) {
  if (version !== SCHEDULER_VERSION) {
    throw new Error(`Unsupported scheduler version: ${version}`);
  }
  return schedulerStateSchema.parse(value);
}

export function createSchedulerState(now: Date) {
  return toSchedulerState(createEmptyCard(now));
}

export function isReviewRating(value: unknown): value is ReviewRating {
  return REVIEW_RATINGS.some((rating) => rating === value);
}

const GRADES: Record<ReviewRating, Grade> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

export function scheduleReview(state: SchedulerState, rating: ReviewRating, now: Date) {
  return toSchedulerState(scheduler.next(toCard(state), now, GRADES[rating]).card);
}

export interface MistakeProgress {
  correctStreak: number;
  isResolved: boolean;
}

// Mistakes are resolved by three consecutive correct reviews; a wrong answer reopens them.
export function updateMistakeProgress(correctStreak: number, isCorrect: boolean): MistakeProgress {
  const nextStreak = isCorrect ? correctStreak + 1 : 0;
  return { correctStreak: nextStreak, isResolved: nextStreak >= MISTAKE_RESOLVE_STREAK };
}

export function ratingForMistake(isCorrect: boolean): ReviewRating {
  return isCorrect ? 3 : 1;
}
