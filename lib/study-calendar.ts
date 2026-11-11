import { shiftStudyDay, studyWeekStart, toStudyDay } from "@/lib/study-days";

export interface CalendarDay {
  // "YYYY-MM-DD" in Vietnam time.
  day: string;
  // Reviews and handed-in work that day.
  count: number;
  // 0 for no study, then four steps of more study.
  level: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
}

export interface StudyCalendar {
  // Columns of seven days, Monday first, oldest week first.
  weeks: CalendarDay[][];
  activeDays: number;
  // Days up to today, the ones that could have had study.
  pastDays: number;
}

function studyLevel(count: number): CalendarDay["level"] {
  if (count === 0) {
    return 0;
  }
  if (count < 5) {
    return 1;
  }
  if (count < 20) {
    return 2;
  }
  return count < 50 ? 3 : 4;
}

// The last few weeks of study as a grid, like a wall calendar ticked off day by day.
export function buildStudyCalendar(
  activity: readonly (Date | string)[],
  now: Date,
  weekCount: number,
): StudyCalendar {
  const counts = new Map<string, number>();
  for (const instant of activity) {
    const day = toStudyDay(instant);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const today = toStudyDay(now);
  const firstDay = shiftStudyDay(studyWeekStart(now), -7 * (weekCount - 1));
  const weeks = Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday): CalendarDay => {
      const day = shiftStudyDay(firstDay, week * 7 + weekday);
      const count = counts.get(day) ?? 0;
      return { day, count, level: studyLevel(count), isFuture: day > today };
    }),
  );
  const past = weeks.flat().filter((item) => !item.isFuture);
  return {
    weeks,
    activeDays: past.filter((item) => item.count > 0).length,
    pastDays: past.length,
  };
}
