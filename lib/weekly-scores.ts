import { shiftStudyDay, studyWeekStart } from "@/lib/study-days";

export interface ScoredWork {
  percent: number | null;
  submittedAt: string | null;
}

export interface WeekScore {
  /** Monday of the week, "YYYY-MM-DD" in Vietnam time. */
  weekStart: string;
  percent: number | null;
  count: number;
}

/**
 * Mean percent of scored work per Vietnam-time week, oldest first and ending with the current
 * week. Weeks without scored work stay null rather than counting as zero.
 */
export function weeklyScores(items: readonly ScoredWork[], now: Date, weeks: number): WeekScore[] {
  const currentWeek = studyWeekStart(now);
  const starts = Array.from({ length: weeks }, (_, index) =>
    shiftStudyDay(currentWeek, -7 * (weeks - 1 - index)),
  );
  const groups = new Map(starts.map((weekStart) => [weekStart, [] as number[]]));
  for (const item of items) {
    if (item.percent !== null && item.submittedAt) {
      groups.get(studyWeekStart(item.submittedAt))?.push(item.percent);
    }
  }
  return starts.map((weekStart) => {
    const values = groups.get(weekStart) ?? [];
    return {
      weekStart,
      percent: values.length
        ? values.reduce((total, value) => total + value, 0) / values.length
        : null,
      count: values.length,
    };
  });
}
