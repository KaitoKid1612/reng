// A learner's daily practice day by day: the colour band and short label of each day, the
// overview figures and the month groups of the day list. Pure, so learner and teacher pages and
// the tests share one definition.

export type ScoreBand = "good" | "fair" | "low" | "none";

// 80% is the class target and below 60% a day needs review, the bands of the old sheet.
export const SCORE_TARGET_PERCENT = 80;
const SCORE_FAIR_PERCENT = 60;
// The newest scored day is compared with the mean of at most this many scored days before it.
export const BASELINE_DAYS = 5;
// Thirty columns still leave a visible bar per day at 360px; the day list keeps every date.
export const CHART_DAYS = 30;

/** One daily set of the class: the Vietnam calendar day it belongs to. */
export interface DailyRun {
  date: string;
  assignmentId: string;
}

/** The viewer's side of one daily set. */
export interface DailyResult {
  title: string;
  /** Latest submitted attempt as a percentage, only once the viewer may see the score. */
  percent: number | null;
  submitted: boolean;
  attemptCount: number;
}

export interface DailyDay extends DailyRun, DailyResult {}

export type DailyDayState = "scored" | "submitted" | "in_progress" | "not_done";

export interface DailyLatest {
  date: string;
  percent: number;
  baselineCount: number;
  /** Newest score minus the mean of the baseline days, in percentage points. */
  deltaPercent: number | null;
}

export interface DailyOverview {
  offeredCount: number;
  doneCount: number;
  firstDate: string | null;
  lastDate: string | null;
  scoredCount: number;
  averagePercent: number | null;
  goodCount: number;
  latest: DailyLatest | null;
  streak: number;
}

export function scoreBand(percent: number | null): ScoreBand {
  if (percent === null) {
    return "none";
  }
  if (percent >= SCORE_TARGET_PERCENT) {
    return "good";
  }
  return percent >= SCORE_FAIR_PERCENT ? "fair" : "low";
}

export function formatDayPercent(percent: number) {
  return `${Math.round(percent)}%`;
}

type UnscoredState = Exclude<DailyDayState, "scored">;

function unscoredState(day: DailyResult): UnscoredState {
  if (day.submitted) {
    return "submitted";
  }
  // Attempts are either open or submitted, so attempts without a submission mean one is open.
  return day.attemptCount > 0 ? "in_progress" : "not_done";
}

export function dailyDayState(day: DailyResult): DailyDayState {
  return day.percent === null ? unscoredState(day) : "scored";
}

const SHORT_STATE_LABELS: Record<UnscoredState, string> = {
  submitted: "đã nộp",
  in_progress: "làm dở",
  not_done: "—",
};

const FULL_STATE_LABELS: Record<UnscoredState, string> = {
  submitted: "đã nộp, chưa công bố điểm",
  in_progress: "đang làm dở",
  not_done: "chưa làm",
};

/** The second line of a day chip: "85%", "làm dở" or a dash. */
export function shortDayLabel(day: DailyResult) {
  return day.percent === null
    ? SHORT_STATE_LABELS[unscoredState(day)]
    : formatDayPercent(day.percent);
}

/** What a screen reader and the chart readout say about a day. */
export function fullDayLabel(day: DailyResult) {
  return day.percent === null
    ? FULL_STATE_LABELS[unscoredState(day)]
    : formatDayPercent(day.percent);
}

/**
 * The days a viewer sees, oldest first. Days before the learner joined count only when they did
 * that set anyway, and nothing after `untilDay` (today, or the day the learner left) is shown.
 */
export function buildDailyDays(
  runs: readonly DailyRun[],
  results: ReadonlyMap<string, DailyResult>,
  fromDay: string,
  untilDay: string,
): DailyDay[] {
  return runs
    .flatMap((run) => {
      const result = results.get(run.assignmentId);
      if (!result || run.date > untilDay || (run.date < fromDay && result.attemptCount === 0)) {
        return [];
      }
      return [{ ...run, ...result }];
    })
    .sort((first, second) => first.date.localeCompare(second.date));
}

function mean(values: readonly number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

// Consecutive sets submitted, newest first. Today's set is still open, so a learner who has not
// done it yet keeps yesterday's streak.
function countDoneStreak(days: readonly DailyDay[], today: string) {
  const newestFirst = [...days].reverse();
  const start = newestFirst[0]?.date === today && !newestFirst[0].submitted ? 1 : 0;
  let streak = 0;
  for (const day of newestFirst.slice(start)) {
    if (!day.submitted) {
      break;
    }
    streak += 1;
  }
  return streak;
}

/** Figures for the stat tiles; `days` is oldest first as `buildDailyDays` returns them. */
export function dailyOverview(days: readonly DailyDay[], today: string): DailyOverview {
  const scored = days.filter((day): day is DailyDay & { percent: number } => day.percent !== null);
  const newest = scored.at(-1);
  const baseline = scored.slice(-1 - BASELINE_DAYS, -1).map((day) => day.percent);
  const baselineMean = mean(baseline);
  return {
    offeredCount: days.length,
    doneCount: days.filter((day) => day.submitted).length,
    firstDate: days[0]?.date ?? null,
    lastDate: days.at(-1)?.date ?? null,
    scoredCount: scored.length,
    averagePercent: mean(scored.map((day) => day.percent)),
    goodCount: scored.filter((day) => day.percent >= SCORE_TARGET_PERCENT).length,
    latest: newest
      ? {
          date: newest.date,
          percent: newest.percent,
          baselineCount: baseline.length,
          deltaPercent: baselineMean === null ? null : newest.percent - baselineMean,
        }
      : null,
    streak: countDoneStreak(days, today),
  };
}

/** Signed change in whole percentage points, with a true minus sign. */
export function describeDelta(deltaPercent: number) {
  const value = Math.round(deltaPercent);
  if (value === 0) {
    return { text: "0", direction: "same" as const };
  }
  return value > 0
    ? { text: `+${value}`, direction: "up" as const }
    : { text: `−${Math.abs(value)}`, direction: "down" as const };
}

/** Newest month first and, inside a month, newest day first, like the old sheet view. */
export function groupDaysByMonth(days: readonly DailyDay[]) {
  const months = new Map<string, DailyDay[]>();
  for (const day of [...days].reverse()) {
    const month = day.date.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), day]);
  }
  return [...months].map(([month, monthDays]) => ({ month, days: monthDays }));
}

/** The requested day when it is in the list, otherwise the newest day. */
export function pickDailyDay(days: readonly DailyDay[], requested: string | undefined) {
  return days.find((day) => day.date === requested) ?? days.at(-1);
}

/** The days either side of `date` in the list, for stepping without going back to the list. */
export function neighbourDays(days: readonly DailyDay[], date: string) {
  const index = days.findIndex((day) => day.date === date);
  if (index < 0) {
    return { older: undefined, newer: undefined };
  }
  return { older: days[index - 1], newer: days[index + 1] };
}
