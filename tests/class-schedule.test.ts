import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classScheduleSchema,
  describeNextSession,
  describeSlot,
  describeUpcomingSession,
  findNextSession,
  normalizeSlots,
} from "../lib/class-schedule";

// 2026-11-03 is a Tuesday. Times are written in Vietnam time (+07:00).
const at = (local: string) => new Date(`${local}+07:00`);
const tuesdayEvening = { weekday: 2, start: "19:30", minutes: 90 };
const thursdayEvening = { weekday: 4, start: "19:30", minutes: 90 };

test("slots read as Vietnamese weekdays with start and end times", () => {
  assert.equal(describeSlot(tuesdayEvening), "Thứ Ba 19:30–21:00");
  assert.equal(describeSlot({ weekday: 7, start: "23:30", minutes: 60 }), "Chủ nhật 23:30–00:30");
});

test("the next session is the earliest one that has not ended", () => {
  const slots = [thursdayEvening, tuesdayEvening];
  const before = findNextSession(slots, at("2026-11-03T08:00:00"));
  assert.deepEqual(before?.startsAt, at("2026-11-03T19:30:00"));
  assert.equal(before?.isLive, false);
  const during = findNextSession(slots, at("2026-11-03T20:15:00"));
  assert.deepEqual(during?.startsAt, at("2026-11-03T19:30:00"));
  assert.equal(during?.isLive, true);
  const after = findNextSession(slots, at("2026-11-03T21:00:00"));
  assert.deepEqual(after?.startsAt, at("2026-11-05T19:30:00"));
  // After Thursday's class the week wraps to next Tuesday.
  const weekend = findNextSession(slots, at("2026-11-07T10:00:00"));
  assert.deepEqual(weekend?.startsAt, at("2026-11-10T19:30:00"));
  assert.equal(findNextSession([], at("2026-11-03T08:00:00")), null);
});

test("Vietnam time decides the day, whatever the server's clock zone", () => {
  // 18:00 UTC on Monday is already 01:00 on Tuesday in Vietnam.
  const next = findNextSession([tuesdayEvening], new Date("2026-11-02T18:00:00Z"));
  assert.deepEqual(next?.startsAt, at("2026-11-03T19:30:00"));
});

test("the next session says today, tomorrow or the date", () => {
  const now = at("2026-11-03T08:00:00");
  const describe = (slot: typeof tuesdayEvening) => {
    const session = findNextSession([slot], now);
    assert.ok(session);
    return describeNextSession(session, now);
  };
  assert.equal(describe(tuesdayEvening), "Hôm nay, 19:30–21:00");
  assert.equal(
    describe({ weekday: 3, start: "07:00", minutes: 60 }),
    "Ngày mai (Thứ Tư 04/11), 07:00–08:00",
  );
  assert.equal(describe(thursdayEvening), "Thứ Năm 05/11, 19:30–21:00");
});

test("slots are ordered Monday first and duplicates kept once", () => {
  assert.deepEqual(normalizeSlots([thursdayEvening, tuesdayEvening, tuesdayEvening]), [
    tuesdayEvening,
    thursdayEvening,
  ]);
});

test("schedules reject impossible times, lengths and oversized lists", () => {
  assert.ok(classScheduleSchema.safeParse({ slots: [tuesdayEvening], note: "Nghỉ 20/11" }).success);
  for (const slot of [
    { ...tuesdayEvening, start: "24:00" },
    { ...tuesdayEvening, start: "7:30" },
    { ...tuesdayEvening, weekday: 0 },
    { ...tuesdayEvening, minutes: 10 },
    { ...tuesdayEvening, extra: true },
  ]) {
    assert.equal(classScheduleSchema.safeParse({ slots: [slot], note: "" }).success, false);
  }
  assert.equal(
    classScheduleSchema.safeParse({ slots: Array(15).fill(tuesdayEvening), note: "" }).success,
    false,
  );
  assert.equal(classScheduleSchema.safeParse({ slots: [], note: "x".repeat(301) }).success, false);
});

test("a class in progress says so", () => {
  assert.equal(
    describeUpcomingSession([tuesdayEvening], at("2026-11-03T20:00:00")),
    "Hôm nay, 19:30–21:00 (đang diễn ra)",
  );
  assert.equal(describeUpcomingSession([], at("2026-11-03T20:00:00")), null);
});
