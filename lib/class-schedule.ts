import { z } from "zod";

// Weekly class times in Vietnam wall-clock time (UTC+7, no daylight saving). Weekdays use ISO
// numbers, Monday = 1 to Sunday = 7, the order of a Vietnamese week (Thứ Hai … Chủ nhật).
export const MAX_SCHEDULE_SLOTS = 14;
export const MAX_SCHEDULE_NOTE = 300;
export const SESSION_LENGTHS = [45, 60, 75, 90, 120, 150, 180] as const;

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Thứ Hai",
  2: "Thứ Ba",
  3: "Thứ Tư",
  4: "Thứ Năm",
  5: "Thứ Sáu",
  6: "Thứ Bảy",
  7: "Chủ nhật",
};

export const scheduleSlotSchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    minutes: z.number().int().min(15).max(300),
  })
  .strict();

export const classScheduleSchema = z
  .object({
    slots: z.array(scheduleSlotSchema).max(MAX_SCHEDULE_SLOTS),
    note: z.string().trim().max(MAX_SCHEDULE_NOTE),
  })
  .strict();

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;
export type ClassSchedule = z.infer<typeof classScheduleSchema>;

export const EMPTY_SCHEDULE: ClassSchedule = { slots: [], note: "" };

function startMinutes(slot: ScheduleSlot) {
  const [hours, minutes] = slot.start.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatClock(totalMinutes: number) {
  const minutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// Monday first, then by start time; a slot entered twice is kept once.
export function normalizeSlots(slots: readonly ScheduleSlot[]) {
  const unique = new Map(
    slots.map((slot) => [`${slot.weekday}-${slot.start}-${slot.minutes}`, slot]),
  );
  return [...unique.values()].sort(
    (first, second) => first.weekday - second.weekday || startMinutes(first) - startMinutes(second),
  );
}

export function describeSlot(slot: ScheduleSlot) {
  return `${WEEKDAY_LABELS[slot.weekday]} ${slot.start}–${formatClock(startMinutes(slot) + slot.minutes)}`;
}

export interface NextSession {
  startsAt: Date;
  endsAt: Date;
  isLive: boolean;
}

// Vietnam wall-clock fields of an instant, read through the UTC getters.
function vietnamClock(instant: number) {
  return new Date(instant + VIETNAM_OFFSET_MS);
}

// The earliest session that has not ended, so a class in progress shows as live.
export function findNextSession(slots: readonly ScheduleSlot[], now: Date): NextSession | null {
  const clock = vietnamClock(now.getTime());
  const midnight =
    Date.UTC(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate()) - VIETNAM_OFFSET_MS;
  const today = clock.getUTCDay() === 0 ? 7 : clock.getUTCDay();
  let next: NextSession | null = null;
  for (const slot of slots) {
    let start =
      midnight + ((slot.weekday - today + 7) % 7) * DAY_MS + startMinutes(slot) * MINUTE_MS;
    if (start + slot.minutes * MINUTE_MS <= now.getTime()) {
      start += 7 * DAY_MS;
    }
    if (!next || start < next.startsAt.getTime()) {
      const end = start + slot.minutes * MINUTE_MS;
      next = {
        startsAt: new Date(start),
        endsAt: new Date(end),
        isLive: start <= now.getTime() && now.getTime() < end,
      };
    }
  }
  return next;
}

function vietnamDay(instant: number) {
  return vietnamClock(instant).toISOString().slice(0, 10);
}

// "Hôm nay, 19:30–21:00", "Ngày mai (Thứ Năm 05/11), 19:30–21:00" or "Thứ Năm 05/11, 19:30–21:00".
export function describeNextSession(session: NextSession, now: Date) {
  const start = vietnamClock(session.startsAt.getTime());
  const end = vietnamClock(session.endsAt.getTime());
  const weekday = WEEKDAY_LABELS[start.getUTCDay() === 0 ? 7 : start.getUTCDay()];
  const date = `${String(start.getUTCDate()).padStart(2, "0")}/${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  const time = `${formatClock(start.getUTCHours() * 60 + start.getUTCMinutes())}–${formatClock(end.getUTCHours() * 60 + end.getUTCMinutes())}`;
  const day = vietnamDay(session.startsAt.getTime());
  if (day === vietnamDay(now.getTime())) {
    return `Hôm nay, ${time}`;
  }
  if (day === vietnamDay(now.getTime() + DAY_MS)) {
    return `Ngày mai (${weekday} ${date}), ${time}`;
  }
  return `${weekday} ${date}, ${time}`;
}

// The next-session line every class view shows, or null without a timetable.
export function describeUpcomingSession(slots: readonly ScheduleSlot[], now: Date) {
  const session = findNextSession(slots, now);
  if (!session) {
    return null;
  }
  return `${describeNextSession(session, now)}${session.isLive ? " (đang diễn ra)" : ""}`;
}
