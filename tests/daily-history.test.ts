import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildDailyDays,
  dailyDayState,
  dailyOverview,
  describeDelta,
  fullDayLabel,
  groupDaysByMonth,
  neighbourDays,
  pickDailyDay,
  scoreBand,
  shortDayLabel,
} from "../lib/daily-history";

import type { DailyDay, DailyResult } from "../lib/daily-history";

function result(overrides: Partial<DailyResult> = {}): DailyResult {
  return { title: "Luyện tập", percent: null, submitted: false, attemptCount: 0, ...overrides };
}

function done(date: string, percent: number | null): DailyDay {
  return {
    date,
    assignmentId: `a-${date}`,
    ...result({ percent, submitted: true, attemptCount: 1 }),
  };
}

function missed(date: string): DailyDay {
  return { date, assignmentId: `a-${date}`, ...result() };
}

test("score bands follow the old sheet: 80% and up, 60–79%, below 60%, no score", () => {
  assert.equal(scoreBand(80), "good");
  assert.equal(scoreBand(100), "good");
  assert.equal(scoreBand(79.9), "fair");
  assert.equal(scoreBand(60), "fair");
  assert.equal(scoreBand(59.9), "low");
  assert.equal(scoreBand(0), "low");
  assert.equal(scoreBand(null), "none");
});

test("a day without a score says why: hidden score, open attempt or not done", () => {
  assert.equal(dailyDayState(result({ percent: 70, submitted: true, attemptCount: 1 })), "scored");
  assert.equal(dailyDayState(result({ submitted: true, attemptCount: 1 })), "submitted");
  assert.equal(dailyDayState(result({ attemptCount: 1 })), "in_progress");
  assert.equal(dailyDayState(result()), "not_done");
  assert.equal(shortDayLabel(result({ percent: 66.67, submitted: true })), "67%");
  assert.equal(shortDayLabel(result({ attemptCount: 1 })), "làm dở");
  assert.equal(shortDayLabel(result()), "—");
  assert.equal(fullDayLabel(result({ percent: 90, submitted: true })), "90%");
  assert.equal(fullDayLabel(result({ submitted: true })), "đã nộp, chưa công bố điểm");
  assert.equal(fullDayLabel(result()), "chưa làm");
});

test("days before joining count only when done, and nothing after the last day shows", () => {
  const runs = [
    { date: "2026-11-03", assignmentId: "c" },
    { date: "2026-11-01", assignmentId: "a" },
    { date: "2026-11-02", assignmentId: "b" },
    { date: "2026-10-30", assignmentId: "early-done" },
    { date: "2026-10-31", assignmentId: "early" },
    { date: "2026-11-04", assignmentId: "later" },
    { date: "2026-11-02", assignmentId: "unknown-assignment" },
  ];
  const results = new Map([
    ["a", result()],
    ["b", result({ percent: 50, submitted: true, attemptCount: 1 })],
    ["c", result()],
    ["early-done", result({ percent: 90, submitted: true, attemptCount: 2 })],
    ["early", result()],
    ["later", result()],
  ]);
  const days = buildDailyDays(runs, results, "2026-11-01", "2026-11-03");
  assert.deepEqual(
    days.map((day) => day.assignmentId),
    ["early-done", "a", "b", "c"],
  );
  assert.deepEqual(
    days.map((day) => day.date),
    ["2026-10-30", "2026-11-01", "2026-11-02", "2026-11-03"],
  );
});

test("the overview counts done days, averages scored ones and compares the newest", () => {
  const days = [
    done("2026-10-28", 50),
    done("2026-10-29", 60),
    missed("2026-10-30"),
    done("2026-10-31", 70),
    done("2026-11-01", 80),
    done("2026-11-02", 90),
    done("2026-11-03", null),
    done("2026-11-04", 100),
  ];
  const overview = dailyOverview(days, "2026-11-04");
  assert.equal(overview.offeredCount, 8);
  assert.equal(overview.doneCount, 7);
  assert.equal(overview.firstDate, "2026-10-28");
  assert.equal(overview.lastDate, "2026-11-04");
  assert.equal(overview.scoredCount, 6);
  assert.equal(overview.averagePercent, 75);
  assert.equal(overview.goodCount, 3);
  // The five scored days before the newest (50 to 90) average 70.
  assert.deepEqual(overview.latest, {
    date: "2026-11-04",
    percent: 100,
    baselineCount: 5,
    deltaPercent: 30,
  });
  // A submitted day with a hidden score still continues the streak; the missed day ends it.
  assert.equal(overview.streak, 5);
});

test("today's open set does not break the streak, but a missed earlier day does", () => {
  const before = [done("2026-11-02", 80), done("2026-11-03", 70), missed("2026-11-04")];
  assert.equal(dailyOverview(before, "2026-11-04").streak, 2);
  assert.equal(dailyOverview(before, "2026-11-05").streak, 0);
  assert.equal(dailyOverview([], "2026-11-04").streak, 0);
  assert.equal(dailyOverview([], "2026-11-04").averagePercent, null);
  assert.equal(dailyOverview([], "2026-11-04").latest, null);
});

test("the first scored day has nothing to compare with", () => {
  const overview = dailyOverview([missed("2026-11-03"), done("2026-11-04", 65)], "2026-11-04");
  assert.deepEqual(overview.latest, {
    date: "2026-11-04",
    percent: 65,
    baselineCount: 0,
    deltaPercent: null,
  });
});

test("score changes read as whole points with a true minus sign", () => {
  assert.deepEqual(describeDelta(4.6), { text: "+5", direction: "up" });
  assert.deepEqual(describeDelta(-12.4), { text: "−12", direction: "down" });
  assert.deepEqual(describeDelta(0.4), { text: "0", direction: "same" });
});

test("months and days list newest first, and a day steps to its neighbours", () => {
  const days = [done("2026-10-30", 70), done("2026-10-31", 80), missed("2026-11-01")];
  assert.deepEqual(
    groupDaysByMonth(days).map((group) => [group.month, group.days.map((day) => day.date)]),
    [
      ["2026-11", ["2026-11-01"]],
      ["2026-10", ["2026-10-31", "2026-10-30"]],
    ],
  );
  assert.equal(pickDailyDay(days, "2026-10-31")?.date, "2026-10-31");
  assert.equal(pickDailyDay(days, "2026-12-01")?.date, "2026-11-01");
  assert.equal(pickDailyDay(days, undefined)?.date, "2026-11-01");
  assert.equal(pickDailyDay([], undefined), undefined);
  const middle = neighbourDays(days, "2026-10-31");
  assert.equal(middle.older?.date, "2026-10-30");
  assert.equal(middle.newer?.date, "2026-11-01");
  assert.deepEqual(neighbourDays(days, "2026-12-01"), { older: undefined, newer: undefined });
});
