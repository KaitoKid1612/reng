// Vietnam has no daylight saving time, so a fixed offset gives the learner's calendar day.
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const STUDY_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function toStudyDay(instant: Date | string) {
  const time = typeof instant === "string" ? Date.parse(instant) : instant.getTime();
  if (Number.isNaN(time)) {
    throw new Error("Invalid study timestamp.");
  }
  return new Date(time + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
}

function previousDay(day: string) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

// Counts consecutive study days ending today, or yesterday when today has no activity yet.
export function countStudyStreak(activity: readonly (Date | string)[], now: Date) {
  const days = new Set(activity.map(toStudyDay));
  let cursor = toStudyDay(now);
  if (!days.has(cursor)) {
    cursor = previousDay(cursor);
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

/** Monday of the Vietnam-time week containing the instant, as "YYYY-MM-DD". */
export function studyWeekStart(instant: Date | string) {
  const day = Date.parse(`${toStudyDay(instant)}T00:00:00Z`);
  const daysSinceMonday = (new Date(day).getUTCDay() + 6) % 7;
  return new Date(day - daysSinceMonday * DAY_MS).toISOString().slice(0, 10);
}

/** Moves a "YYYY-MM-DD" calendar day by whole days. */
export function shiftStudyDay(day: string, days: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The instant a Vietnam calendar day starts. */
export function studyDayStart(day: string) {
  return Date.parse(`${day}T00:00:00Z`) - VIETNAM_OFFSET_MS;
}

export function latestStudyDay(activity: readonly (Date | string)[]) {
  return activity.map(toStudyDay).sort().at(-1) ?? null;
}

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: STUDY_TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

export function formatStudyDateTime(instant: string | Date) {
  return dateTimeFormatter.format(typeof instant === "string" ? new Date(instant) : instant);
}

export function formatStudyDay(day: string) {
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
}
