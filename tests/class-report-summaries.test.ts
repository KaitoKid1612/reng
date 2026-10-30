import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildMemberReport,
  selectLatestSubmissions,
  summarizeAssignmentResults,
  summarizeWeekSubmissions,
} from "../lib/class-report";
import { studyDayStart, studyWeekStart } from "../lib/study-days";
import { weeklyScores } from "../lib/weekly-scores";

import type { ReportAssignment, ReportMember, ReportSubmission } from "../lib/class-report";

function member(userId: string, joinedAt: string): ReportMember {
  return { userId, fullName: userId, email: `${userId}@example.test`, joinedAt };
}

function submission(
  userId: string,
  assignmentId: string,
  score: number,
  maxScore = 10,
): ReportSubmission {
  return {
    assignmentId,
    userId,
    attemptNo: 1,
    score,
    maxScore,
    submittedAt: "2026-10-27T03:00:00Z",
  };
}

function reportsFor(
  members: ReportMember[],
  assignments: ReportAssignment[],
  submissions: ReportSubmission[],
  now: Date,
) {
  const latest = selectLatestSubmissions(submissions);
  return members.map((item) =>
    buildMemberReport({ member: item, assignments, latest, passScore: 70, now }),
  );
}

test("study weeks start on Monday in Vietnam time", () => {
  // Friday morning, Sunday night and the first minutes of Monday in Vietnam.
  assert.equal(studyWeekStart("2026-10-30T03:00:00Z"), "2026-10-26");
  assert.equal(studyWeekStart("2026-11-01T16:00:00Z"), "2026-10-26");
  assert.equal(studyWeekStart("2026-10-25T16:59:00Z"), "2026-10-19");
  assert.equal(studyWeekStart("2026-10-25T17:30:00Z"), "2026-10-26");
  assert.equal(studyDayStart("2026-10-26"), Date.parse("2026-10-25T17:00:00Z"));
});

test("assignment results use current members' latest attempts and skip unassigned work", () => {
  const now = new Date("2026-10-28T00:00:00Z");
  const assignments = [
    { id: "a1", title: "Bài 1", dueAt: null, publishedAt: "2026-10-01T00:00:00Z" },
    { id: "a2", title: "Bài 2", dueAt: null, publishedAt: "2026-10-11T00:00:00Z" },
    { id: "a3", title: "Bài 3", dueAt: null, publishedAt: "2026-10-12T00:00:00Z" },
  ];
  // m2 joined after a1 was published and never submitted it, so a1 is not their work.
  const reports = reportsFor(
    [member("m1", "2026-09-30T00:00:00Z"), member("m2", "2026-10-05T00:00:00Z")],
    assignments,
    [submission("m1", "a1", 5), submission("m1", "a2", 10), submission("m2", "a2", 7)],
    now,
  );
  const results = summarizeAssignmentResults(assignments, reports);
  assert.deepEqual(results.get("a1"), { assignedCount: 1, submittedCount: 1, averagePercent: 50 });
  assert.deepEqual(results.get("a2"), { assignedCount: 2, submittedCount: 2, averagePercent: 85 });
  assert.deepEqual(results.get("a3"), {
    assignedCount: 2,
    submittedCount: 0,
    averagePercent: null,
  });
});

test("the weekly submission rate counts only work already due since Monday", () => {
  // Wednesday noon in Vietnam.
  const now = new Date("2026-10-28T05:00:00Z");
  const publishedAt = "2026-10-20T00:00:00Z";
  const assignments = [
    // Due Sunday night of the previous week.
    { id: "last-week", title: "Tuần trước", dueAt: "2026-10-25T16:59:00Z", publishedAt },
    // Due Monday and Tuesday nights.
    { id: "monday", title: "Thứ Hai", dueAt: "2026-10-26T16:59:00Z", publishedAt },
    { id: "tuesday", title: "Thứ Ba", dueAt: "2026-10-27T16:59:00Z", publishedAt },
    // Due tonight: not finished yet, so not counted.
    { id: "tonight", title: "Hôm nay", dueAt: "2026-10-28T16:59:00Z", publishedAt },
    { id: "open", title: "Không hạn", dueAt: null, publishedAt },
  ];
  const reports = reportsFor(
    [member("m1", "2026-10-01T00:00:00Z"), member("m2", "2026-10-01T00:00:00Z")],
    assignments,
    [
      submission("m1", "monday", 8),
      submission("m1", "tuesday", 9),
      submission("m2", "monday", 4),
      submission("m2", "tonight", 10),
    ],
    now,
  );
  assert.deepEqual(summarizeWeekSubmissions(assignments, reports, now), {
    weekStart: "2026-10-26",
    dueCount: 2,
    expectedCount: 4,
    submittedCount: 3,
    percent: 75,
  });
  assert.equal(
    summarizeWeekSubmissions(assignments, reports, new Date("2026-10-26T01:00:00Z")).percent,
    null,
  );
});

test("weekly scores average scored work per Vietnam week and keep empty weeks blank", () => {
  // Wednesday 28/10 in Vietnam: the current week starts on Monday 26/10.
  const now = new Date("2026-10-28T05:00:00Z");
  const weeks = weeklyScores(
    [
      { percent: 80, submittedAt: "2026-10-26T02:00:00Z" },
      { percent: 60, submittedAt: "2026-10-27T10:00:00Z" },
      // Sunday 23:30 in Vietnam belongs to the previous week.
      { percent: 90, submittedAt: "2026-10-25T16:30:00Z" },
      // Not scored yet, or never submitted: left out.
      { percent: null, submittedAt: "2026-10-27T10:00:00Z" },
      { percent: 100, submittedAt: null },
      // Older than the window.
      { percent: 10, submittedAt: "2026-09-01T00:00:00Z" },
    ],
    now,
    3,
  );
  assert.deepEqual(weeks, [
    { weekStart: "2026-10-12", percent: null, count: 0 },
    { weekStart: "2026-10-19", percent: 90, count: 1 },
    { weekStart: "2026-10-26", percent: 70, count: 2 },
  ]);
});
