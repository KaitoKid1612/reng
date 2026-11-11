// Streak goals shown to learners: each milestone is the next thing to aim for after the last.
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365] as const;

export interface StreakStatus {
  days: number;
  hasStudiedToday: boolean;
  // The last milestone reached, 0 before the first one.
  previousMilestone: number;
  // The next milestone to reach, null after the last one.
  nextMilestone: number | null;
}

export function describeStreak(days: number, hasStudiedToday: boolean): StreakStatus {
  const nextMilestone = STREAK_MILESTONES.find((milestone) => milestone > days) ?? null;
  const reached = STREAK_MILESTONES.filter((milestone) => milestone <= days);
  return { days, hasStudiedToday, previousMilestone: reached.at(-1) ?? 0, nextMilestone };
}

// Milestones the streak has reached, for the badges on the progress page.
export function reachedStreakMilestones(days: number) {
  return STREAK_MILESTONES.filter((milestone) => milestone <= days);
}
