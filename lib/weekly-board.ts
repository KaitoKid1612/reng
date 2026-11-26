import { shiftStudyDay, studyDayStart, studyWeekStart, toStudyDay } from "@/lib/study-days";

/**
 * The weekly board: learners of one teacher's classes that joined it, ranked by correct answers
 * this Vietnam-time week (Monday to Sunday). Each assignment counts once, at the learner's best
 * attempt, so redoing a practice set does not farm points.
 */

export interface BoardSubmission {
  userId: string;
  assignmentId: string;
  score: number;
  submittedAt: string;
}

export interface BoardRow {
  userId: string;
  points: number;
  activeDays: number;
}

export interface BoardWeek {
  start: string;
  // The day after Sunday, exclusive.
  end: string;
  startsAt: string;
  endsAt: string;
}

export function boardWeek(now: Date, weeksBack = 0): BoardWeek {
  const start = shiftStudyDay(studyWeekStart(now), -7 * weeksBack);
  const end = shiftStudyDay(start, 7);
  return {
    start,
    end,
    startsAt: new Date(studyDayStart(start)).toISOString(),
    endsAt: new Date(studyDayStart(end)).toISOString(),
  };
}

export function rankBoard(
  members: readonly string[],
  submissions: readonly BoardSubmission[],
  week: BoardWeek,
): BoardRow[] {
  const from = Date.parse(week.startsAt);
  const to = Date.parse(week.endsAt);
  const best = new Map<string, number>();
  const days = new Map<string, Set<string>>();
  const memberSet = new Set(members);
  for (const item of submissions) {
    const time = Date.parse(item.submittedAt);
    if (!memberSet.has(item.userId) || time < from || time >= to) {
      continue;
    }
    const key = `${item.userId}:${item.assignmentId}`;
    best.set(key, Math.max(best.get(key) ?? 0, item.score));
    const learnerDays = days.get(item.userId) ?? new Set<string>();
    learnerDays.add(toStudyDay(item.submittedAt));
    days.set(item.userId, learnerDays);
  }
  const points = new Map<string, number>();
  for (const [key, score] of best) {
    const userId = key.slice(0, key.indexOf(":"));
    points.set(userId, (points.get(userId) ?? 0) + score);
  }
  return members
    .map((userId) => ({
      userId,
      points: points.get(userId) ?? 0,
      activeDays: days.get(userId)?.size ?? 0,
    }))
    .toSorted(
      (first, second) =>
        second.points - first.points ||
        second.activeDays - first.activeDays ||
        first.userId.localeCompare(second.userId),
    );
}

/**
 * The rows a viewer sees: learners with correct answers this week, plus the viewer's own row so
 * they know where they stand. A learner with nothing yet is left off others' boards instead of
 * being listed last by name. Learners who hid themselves are seen only by themselves.
 */
export function visibleBoardRows(
  rows: readonly BoardRow[],
  viewerId: string,
  isHidden: (userId: string) => boolean,
) {
  return rows.filter((row) => row.userId === viewerId || (row.points > 0 && !isHidden(row.userId)));
}

/** Days left in the week including today, for "còn 3 ngày". */
export function daysLeftInWeek(week: BoardWeek, now: Date) {
  const today = toStudyDay(now);
  let count = 0;
  for (let day = today; day < week.end; day = shiftStudyDay(day, 1)) {
    count += 1;
  }
  return count;
}
