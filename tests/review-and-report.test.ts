import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildMemberReport,
  buildReportCsv,
  computeLearnerLabel,
  escapeCsvCell,
  selectLatestSubmissions,
  summarizeClass,
  summarizeListening,
} from "../lib/class-report";
import { createJoinCode, formatJoinCode, isJoinCode, normalizeJoinCode } from "../lib/join-code";
import {
  createSchedulerState,
  parseSchedulerState,
  scheduleReview,
  SCHEDULER_VERSION,
  updateMistakeProgress,
} from "../lib/srs";
import { countStudyStreak, toStudyDay } from "../lib/study-days";

test("FSRS state round-trips with a locked scheduler version", () => {
  const now = new Date("2026-10-28T01:00:00Z");
  const initial = createSchedulerState(now);
  const reviewed = scheduleReview(initial, 3, now);
  assert.equal(reviewed.reps, 1);
  assert.ok(Date.parse(reviewed.due) > now.getTime());
  assert.deepEqual(
    parseSchedulerState(SCHEDULER_VERSION, JSON.parse(JSON.stringify(reviewed))),
    reviewed,
  );
  assert.throws(() => parseSchedulerState("fsrs-unknown", reviewed));
  assert.throws(() => parseSchedulerState(SCHEDULER_VERSION, { ...reviewed, reps: -1 }));
  const forgotten = scheduleReview(reviewed, 1, new Date(reviewed.due));
  assert.ok(
    Date.parse(forgotten.due) <=
      Date.parse(scheduleReview(reviewed, 4, new Date(reviewed.due)).due),
  );
});

test("mistakes resolve after three consecutive correct reviews and reopen on failure", () => {
  let progress = updateMistakeProgress(0, true);
  progress = updateMistakeProgress(progress.correctStreak, true);
  assert.deepEqual(progress, { correctStreak: 2, isResolved: false });
  assert.deepEqual(updateMistakeProgress(progress.correctStreak, false), {
    correctStreak: 0,
    isResolved: false,
  });
  assert.deepEqual(updateMistakeProgress(progress.correctStreak, true), {
    correctStreak: 3,
    isResolved: true,
  });
});

test("study streaks use Vietnam calendar days", () => {
  assert.equal(toStudyDay("2026-10-27T17:30:00Z"), "2026-10-28");
  const now = new Date("2026-10-28T03:00:00Z");
  assert.equal(countStudyStreak(["2026-10-27T02:00:00Z", "2026-10-26T02:00:00Z"], now), 2);
  assert.equal(countStudyStreak(["2026-10-28T00:10:00Z", "2026-10-27T02:00:00Z"], now), 2);
  assert.equal(countStudyStreak(["2026-10-25T02:00:00Z"], now), 0);
});

test("join codes avoid ambiguous characters and normalize learner input", () => {
  let seed = 0;
  const code = createJoinCode((size) => seed++ % size);
  assert.equal(isJoinCode(code), true);
  assert.equal(/[01ILO]/.test(code), false);
  assert.equal(normalizeJoinCode(" abcd-efgh "), "ABCDEFGH");
  assert.equal(formatJoinCode("ABCDEFGH"), "ABCD-EFGH");
  assert.equal(isJoinCode("ABCD1FGH"), false);
});

const assignments = [
  { id: "a1", title: "Bài 1", dueAt: "2026-10-10T00:00:00Z", publishedAt: "2026-10-01T00:00:00Z" },
  { id: "a2", title: "Bài 2", dueAt: "2026-10-20T00:00:00Z", publishedAt: "2026-10-11T00:00:00Z" },
  { id: "a3", title: "=Bài 3", dueAt: null, publishedAt: "2026-10-21T00:00:00Z" },
];
const member = {
  userId: "u1",
  fullName: "Trần Thị Ngọc Ánh",
  email: "anh@example.test",
  joinedAt: "2026-09-30T00:00:00Z",
};
const now = new Date("2026-10-28T00:00:00Z");

test("reports use the latest attempt and average percentages instead of raw scores", () => {
  const latest = selectLatestSubmissions([
    {
      assignmentId: "a1",
      userId: "u1",
      attemptNo: 1,
      score: 10,
      maxScore: 10,
      submittedAt: "2026-10-02T00:00:00Z",
    },
    {
      assignmentId: "a1",
      userId: "u1",
      attemptNo: 2,
      score: 5,
      maxScore: 10,
      submittedAt: "2026-10-03T00:00:00Z",
    },
    {
      assignmentId: "a2",
      userId: "u1",
      attemptNo: 1,
      score: 3,
      maxScore: 3,
      submittedAt: "2026-10-12T00:00:00Z",
    },
  ]);
  const report = buildMemberReport({ member, assignments, latest, passScore: 70, now });
  assert.deepEqual(report.percents, { a1: 50, a2: 100, a3: null });
  assert.equal(report.averagePercent, 75);
  assert.equal(report.submittedCount, 2);
  assert.equal(report.assignedCount, 3);
  assert.equal(report.label, "passing");
});

test("labels follow abandoned, failing, weak listening, passing and no-data precedence", () => {
  const empty = new Map();
  assert.equal(
    buildMemberReport({ member, assignments, latest: empty, passScore: 70, now }).label,
    "abandoned",
  );
  const rejoined = { ...member, joinedAt: "2026-10-15T00:00:00Z" };
  assert.equal(
    buildMemberReport({ member: rejoined, assignments, latest: empty, passScore: 70, now }).label,
    "no_data",
    "work published before the current join does not count",
  );
  const earlierWork = selectLatestSubmissions([
    {
      assignmentId: "a1",
      userId: "u1",
      attemptNo: 1,
      score: 4,
      maxScore: 5,
      submittedAt: "2026-10-16T00:00:00Z",
    },
  ]);
  const lateJoiner = buildMemberReport({
    member: rejoined,
    assignments,
    latest: earlierWork,
    passScore: 70,
    now,
  });
  assert.deepEqual(
    [lateJoiner.assignedCount, lateJoiner.submittedCount, lateJoiner.averagePercent],
    [2, 1, 80],
    "earlier work counts once the learner submits it",
  );
  const listening = { percent: null, averageListens: null };
  assert.equal(
    computeLearnerLabel({ isAbandoned: false, averagePercent: 69.9, passScore: 70, listening }),
    "failing",
  );
  assert.equal(
    computeLearnerLabel({
      isAbandoned: false,
      averagePercent: 90,
      passScore: 70,
      listening: { percent: 55, averageListens: 1 },
    }),
    "weak_listening",
  );
  assert.equal(
    computeLearnerLabel({
      isAbandoned: false,
      averagePercent: 90,
      passScore: 70,
      listening: { percent: 80, averageListens: 3.5 },
    }),
    "weak_listening",
  );
});

test("listening summaries come from listening answers only and stay empty without them", () => {
  assert.deepEqual(summarizeListening(undefined), { percent: null, averageListens: null });
  assert.deepEqual(
    summarizeListening({ pointsEarned: 0, maxPoints: 0, listenTotal: 0, answerCount: 0 }),
    { percent: null, averageListens: null },
  );
  const summary = summarizeListening({
    pointsEarned: 1,
    maxPoints: 3,
    listenTotal: 7,
    answerCount: 2,
  });
  assert.equal(Math.round(summary.percent ?? 0), 33);
  assert.equal(summary.averageListens, 3.5);
  assert.equal(
    computeLearnerLabel({
      isAbandoned: false,
      averagePercent: 90,
      passScore: 70,
      listening: summary,
    }),
    "weak_listening",
  );
});

test("CSV keeps Vietnamese text, leaves missing scores blank and neutralizes formulas", () => {
  const latest = selectLatestSubmissions([
    {
      assignmentId: "a1",
      userId: "u1",
      attemptNo: 1,
      score: 2,
      maxScore: 3,
      submittedAt: "2026-10-02T00:00:00Z",
    },
  ]);
  const reports = [
    buildMemberReport({
      member: { ...member, fullName: '=HYPERLINK("x") "Ánh"' },
      assignments,
      latest,
      passScore: 70,
      now,
      lastStudyDay: "2026-10-02",
    }),
  ];
  const csv = buildReportCsv(assignments, reports);
  assert.ok(csv.startsWith("﻿"));
  assert.ok(csv.includes('"\'=HYPERLINK(""x"") ""Ánh"""'));
  assert.ok(csv.includes('"\'=Bài 3 (%)"'));
  assert.ok(csv.includes('"66.7","",""'), "missing scores are blank, not zero");
  assert.ok(csv.includes('"02/10/2026"'));
  assert.equal(escapeCsvCell("-1+2"), '"\'-1+2"');
  assert.equal(escapeCsvCell("@SUM"), '"\'@SUM"');
  assert.deepEqual(summarizeClass(reports), {
    submittedCount: 1,
    averagePercent: (2 / 3) * 100,
    passingCount: 0,
    attentionCount: 1,
  });
});
