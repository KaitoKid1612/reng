import { formatStudyDay, toStudyDay } from "@/lib/study-days";

// The JLPT session calendar on its own, without the exam logic of lib/jlpt.ts: the countdown in
// every page's header imports it, and lib/jlpt.ts pulls in the assignment schemas (zod).

// The JLPT is held on the first Sunday of July and December. Every session is worked out from
// that rule and marked expected until the Japan Foundation publishes it; list each published date
// here (a published date that is not the first Sunday replaces that month's expected one).
const CONFIRMED_JLPT_SESSIONS: readonly string[] = ["2026-12-06"];

const DAY_MS = 24 * 60 * 60 * 1000;
const JLPT_MONTHS = [7, 12] as const;

function firstSunday(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  first.setUTCDate(1 + ((7 - first.getUTCDay()) % 7));
  return first.toISOString().slice(0, 10);
}

function listJlptSessions(year: number) {
  return JLPT_MONTHS.map((month) => {
    const prefix = `${year}-${String(month).padStart(2, "0")}-`;
    const confirmed = CONFIRMED_JLPT_SESSIONS.find((date) => date.startsWith(prefix));
    return { date: confirmed ?? firstSunday(year, month), isConfirmed: Boolean(confirmed) };
  });
}

/** The session on or after today in Vietnam; the day after a test it moves on to the next one. */
export function findNextJlptSession(now: Date) {
  const today = toStudyDay(now);
  const year = Number(today.slice(0, 4));
  const session = [...listJlptSessions(year), ...listJlptSessions(year + 1)].find(
    (item) => item.date >= today,
  );
  if (!session) {
    return null;
  }
  return {
    ...session,
    daysLeft: Math.round((Date.parse(session.date) - Date.parse(today)) / DAY_MS),
  };
}

export function describeJlptCountdown(now: Date) {
  const session = findNextJlptSession(now);
  if (!session) {
    return null;
  }
  const date = `Chủ nhật ${formatStudyDay(session.date)}${session.isConfirmed ? "" : " (dự kiến)"}`;
  return session.daysLeft === 0
    ? `Hôm nay là ngày thi JLPT, ${date}.`
    : `Còn ${session.daysLeft} ngày tới kỳ thi JLPT, ${date}.`;
}
