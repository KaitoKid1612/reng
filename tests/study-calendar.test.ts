import { test } from "node:test";
import assert from "node:assert/strict";

import { buildStudyCalendar } from "../lib/study-calendar";

test("The study calendar counts Vietnam-time days in Monday-first weeks up to today", () => {
  // Wednesday 11/11/2026, 10:00 in Vietnam.
  const now = new Date("2026-11-11T03:00:00Z");
  const calendar = buildStudyCalendar(
    [
      "2026-11-11T01:00:00Z",
      "2026-11-10T18:00:00Z", // 01:00 on 11/11 in Vietnam
      "2026-11-09T02:00:00Z",
      ...Array.from({ length: 25 }, () => "2026-11-03T02:00:00Z"),
    ],
    now,
    2,
  );
  assert.equal(calendar.weeks.length, 2);
  assert.equal(calendar.weeks[0][0].day, "2026-11-02");
  assert.equal(calendar.weeks[1][2].day, "2026-11-11");
  assert.deepEqual(
    { count: calendar.weeks[1][2].count, level: calendar.weeks[1][2].level },
    { count: 2, level: 1 },
  );
  assert.equal(calendar.weeks[0][1].level, 3);
  assert.equal(calendar.weeks[1][3].isFuture, true);
  assert.equal(calendar.pastDays, 10);
  assert.equal(calendar.activeDays, 3);
});
