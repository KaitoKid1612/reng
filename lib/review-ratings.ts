// Kept apart from lib/srs.ts so browser components do not bundle the scheduler.
export const REVIEW_RATINGS = [1, 2, 3, 4] as const;

export type ReviewRating = (typeof REVIEW_RATINGS)[number];

export const REVIEW_RATING_LABELS: Record<ReviewRating, string> = {
  1: "Quên",
  2: "Khó",
  3: "Được",
  4: "Dễ",
};

export function isReviewRating(value: unknown): value is ReviewRating {
  return REVIEW_RATINGS.some((rating) => rating === value);
}
