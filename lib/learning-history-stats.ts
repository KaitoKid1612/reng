import { historyDates, historyOutcomeSchema } from "@/lib/learning-history";

import type {
  HistoryAnswer,
  HistoryArchive,
  HistoryOutcome,
  HistorySession,
} from "@/lib/learning-history";

export type ScoreBand = "good" | "fair" | "low" | "none";

export interface HistoryDayScore {
  date: string;
  /** Mean of the day's scored sessions on a 0–100 scale; null when the day has no score. */
  percent: number | null;
  /** The same mean in the source scale, kept only when every scored session shares one scale. */
  score: number | null;
  scoreScale: 10 | 100 | null;
}

export interface HistoryLatestScore {
  session: HistorySession;
  score: number;
  percent: number;
  /** Scored sessions before the latest one used for the comparison, at most BASELINE_SESSIONS. */
  baselineCount: number;
  /** Latest minus the baseline mean, in percentage points. */
  deltaPercent: number | null;
}

export interface HistoryOverview {
  dayCount: number;
  firstDate: string | null;
  lastDate: string | null;
  outcomes: Record<HistoryOutcome, number>;
  gradedCount: number;
  accuracyPercent: number | null;
  latest: HistoryLatestScore | null;
}

export interface HistoryKindAccuracy {
  kind: string;
  correct: number;
  graded: number;
  percent: number;
}

/** Kinds below the ranking threshold, summed. */
export interface HistoryKindTotal {
  kindCount: number;
  correct: number;
  graded: number;
  percent: number;
}

// 80% is the class target; below 60% a day needs review.
export const SCORE_TARGET_PERCENT = 80;
const SCORE_FAIR_PERCENT = 60;
export const BASELINE_SESSIONS = 5;
// A kind needs this many graded answers before its accuracy is ranked; one wrong answer
// out of two would otherwise top the "weakest" list.
export const MIN_RANKED_ANSWERS = 5;

const decimalFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

// Multiplying first keeps whole source scores exact (6/10 → 60, not 59.999…).
export function sessionScorePercent(session: HistorySession) {
  return session.score === null ? null : (session.score * 100) / session.scoreScale;
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

export function formatPercentValue(percent: number) {
  return `${Math.round(percent)}%`;
}

export function formatScoreValue(score: number) {
  return decimalFormat.format(score);
}

/** A day's score in its source scale ("8,5"), or as a percentage when scales differ. */
export function formatDayScore(day: HistoryDayScore) {
  if (day.percent === null) {
    return "—";
  }
  if (day.score === null) {
    return formatPercentValue(day.percent);
  }
  return formatScoreValue(day.score);
}

export function formatDayScoreLabel(day: HistoryDayScore) {
  if (day.percent === null) {
    return "chưa có điểm";
  }
  if (day.score === null || day.scoreScale === null) {
    return formatPercentValue(day.percent);
  }
  const value = `${formatScoreValue(day.score)} / ${day.scoreScale}`;
  return day.scoreScale === 100 ? value : `${value} (${formatPercentValue(day.percent)})`;
}

/** Signed change in the latest session's scale, using a true minus sign. */
export function describeScoreDelta(deltaPercent: number, scoreScale: number) {
  const value = Math.round(((deltaPercent * scoreScale) / 100) * 10) / 10;
  if (value === 0) {
    return { text: "0", direction: "same" as const };
  }
  const magnitude = decimalFormat.format(Math.abs(value));
  return value > 0
    ? { text: `+${magnitude}`, direction: "up" as const }
    : { text: `−${magnitude}`, direction: "down" as const };
}

function bySourceOrder(first: HistorySession, second: HistorySession) {
  return first.date.localeCompare(second.date) || first.sourceRow - second.sourceRow;
}

function mean(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** Scored sessions in source order: by date, then by row within the same date. */
function scoredSessions(sessions: readonly HistorySession[]) {
  return sessions.filter((session) => session.score !== null).sort(bySourceOrder);
}

export function historyLatestScore(sessions: readonly HistorySession[]): HistoryLatestScore | null {
  const scored = scoredSessions(sessions);
  const session = scored.at(-1);
  if (!session || session.score === null) {
    return null;
  }
  const percent = (session.score * 100) / session.scoreScale;
  const baseline = scored
    .slice(-1 - BASELINE_SESSIONS, -1)
    .flatMap((item) => sessionScorePercent(item) ?? []);
  return {
    session,
    score: session.score,
    percent,
    baselineCount: baseline.length,
    deltaPercent: baseline.length ? percent - mean(baseline) : null,
  };
}

/** Days that have a score, in the given order; averages count each day once. */
export function scoredDays(days: readonly HistoryDayScore[]) {
  return days.flatMap((day) => (day.percent === null ? [] : [{ ...day, percent: day.percent }]));
}

export function averagePercent(days: readonly { percent: number }[]) {
  return days.length ? mean(days.map((day) => day.percent)) : null;
}

/** One entry per study day, oldest first. Days that only have answers keep a null score. */
export function historyDayScores(
  archive: Pick<HistoryArchive, "sessions" | "answers">,
): HistoryDayScore[] {
  return historyDates(archive)
    .reverse()
    .map((date) => {
      const scored = archive.sessions.flatMap((session) =>
        session.date === date && session.score !== null
          ? [{ score: session.score, scale: session.scoreScale }]
          : [],
      );
      if (!scored.length) {
        return { date, percent: null, score: null, scoreScale: null };
      }
      const scales = new Set(scored.map((item) => item.scale));
      const [scale] = scales;
      const hasOneScale = scales.size === 1 && scale !== undefined;
      return {
        date,
        percent: mean(scored.map((item) => (item.score * 100) / item.scale)),
        score: hasOneScale ? mean(scored.map((item) => item.score)) : null,
        scoreScale: hasOneScale ? scale : null,
      };
    });
}

export function countHistoryOutcomes(answers: readonly HistoryAnswer[]) {
  const counts = Object.fromEntries(
    historyOutcomeSchema.options.map((outcome) => [outcome, 0]),
  ) as Record<HistoryOutcome, number>;
  for (const answer of answers) {
    counts[answer.outcome] += 1;
  }
  return counts;
}

export function historyOverview(archive: HistoryArchive): HistoryOverview {
  const dates = historyDates(archive);
  const outcomes = countHistoryOutcomes(archive.answers);
  const gradedCount = outcomes.correct + outcomes.incorrect;
  return {
    dayCount: dates.length,
    firstDate: dates.at(-1) ?? null,
    lastDate: dates[0] ?? null,
    outcomes,
    gradedCount,
    accuracyPercent: gradedCount ? (outcomes.correct / gradedCount) * 100 : null,
    latest: historyLatestScore(archive.sessions),
  };
}

function compareKindName(first: HistoryKindAccuracy, second: HistoryKindAccuracy) {
  return first.kind.localeCompare(second.kind, "vi");
}

interface KindTotal {
  correct: number;
  graded: number;
  spellings: Map<string, number>;
}

/**
 * Accuracy per source "Dạng bài", counting only answers graded correct or incorrect.
 * Ranked kinds put the weakest first. Kinds with too few graded answers are kept apart and
 * summed into one "other" total, so a long tail never crowds out the ranked list.
 */
export function historyKindAccuracy(answers: readonly HistoryAnswer[]) {
  const totals = new Map<string, KindTotal>();
  for (const answer of answers) {
    if (answer.outcome !== "correct" && answer.outcome !== "incorrect") {
      continue;
    }
    // Sheets mix letter case, spacing and composed/decomposed accents for the same kind.
    const spelling = answer.kind.normalize("NFC").trim().replace(/\s+/g, " ");
    const key = spelling.toLocaleLowerCase("vi");
    const total = totals.get(key) ?? { correct: 0, graded: 0, spellings: new Map() };
    total.graded += 1;
    total.correct += answer.outcome === "correct" ? 1 : 0;
    total.spellings.set(spelling, (total.spellings.get(spelling) ?? 0) + 1);
    totals.set(key, total);
  }
  const kinds = [...totals.values()].map((total) => {
    // The most frequent spelling names the merged kind.
    const [mostUsed] = [...total.spellings].sort(
      (first, second) => second[1] - first[1] || first[0].localeCompare(second[0], "vi"),
    );
    return {
      kind: mostUsed?.[0] ?? "",
      correct: total.correct,
      graded: total.graded,
      percent: (total.correct / total.graded) * 100,
    };
  });
  const sparse = kinds
    .filter((item) => item.graded < MIN_RANKED_ANSWERS)
    .sort((first, second) => second.graded - first.graded || compareKindName(first, second));
  const otherCorrect = sparse.reduce((sum, item) => sum + item.correct, 0);
  const otherGraded = sparse.reduce((sum, item) => sum + item.graded, 0);
  const other: HistoryKindTotal | null = sparse.length
    ? {
        kindCount: sparse.length,
        correct: otherCorrect,
        graded: otherGraded,
        percent: (otherCorrect / otherGraded) * 100,
      }
    : null;
  return {
    ranked: kinds
      .filter((item) => item.graded >= MIN_RANKED_ANSWERS)
      .sort(
        (first, second) =>
          first.percent - second.percent ||
          second.graded - first.graded ||
          compareKindName(first, second),
      ),
    sparse,
    other,
  };
}
