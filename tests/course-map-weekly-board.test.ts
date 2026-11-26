import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCourseMap, countStars, stageTag } from "../lib/course-map";
import { boardWeek, daysLeftInWeek, rankBoard, visibleBoardRows } from "../lib/weekly-board";

const stage = (orderNo: number, isOpen = true) => ({
  lessonId: `l${orderNo}`,
  courseId: "minna-1",
  orderNo,
  lessonOrder: orderNo,
  isOpen,
});

test("stage tags follow the question tags of each course", () => {
  assert.equal(stageTag("minna-1", 17), "minna-17");
  assert.equal(stageTag("minna-2", 26), "minna-26");
  assert.equal(stageTag("chukyu-1", 3), "chukyu-1-3");
});

test("stars need a high rate, and three stars need enough answers", () => {
  assert.equal(countStars(0, 0), 0);
  assert.equal(countStars(1, 4), 1);
  assert.equal(countStars(3, 4), 2);
  assert.equal(countStars(9, 9), 2);
  assert.equal(countStars(9, 10), 3);
});

test("the class's furthest taught lesson marks every earlier stage done", () => {
  const stages = [stage(1), stage(2), stage(3), stage(4), stage(5, false)];
  const map = buildCourseMap(stages, new Set(), [{ lessonId: "l3", isFinished: false }], []);
  assert.deepEqual(
    map.map((item) => item.status),
    ["done", "done", "next", "open", "locked"],
  );
  const finished = buildCourseMap(stages, new Set(), [{ lessonId: "l3", isFinished: true }], []);
  assert.deepEqual(
    finished.map((item) => item.status),
    ["done", "done", "done", "next", "locked"],
  );
});

test("a lesson the learner marked read is done even ahead of the class", () => {
  const map = buildCourseMap([stage(1), stage(2), stage(3)], new Set(["l2"]), [], []);
  assert.deepEqual(
    map.map((item) => item.status),
    ["next", "done", "open"],
  );
});

test("stars come from the stage's tagged answers", () => {
  const answers = [
    ...Array.from({ length: 10 }, () => ({ tags: ["minna-1", "grammar:x"], isCorrect: true })),
    { tags: ["minna-2"], isCorrect: false },
    { tags: ["minna-2"], isCorrect: true },
  ];
  const map = buildCourseMap([stage(1), stage(2), stage(3)], new Set(), [], answers);
  assert.deepEqual(
    map.map((item) => [item.stars, item.answered]),
    [
      [3, 10],
      [1, 2],
      [0, 0],
    ],
  );
});

test("the board week runs Monday to Sunday in Vietnam time", () => {
  // Sunday 23:30 in Vietnam is still the week that began on Monday 16/11.
  const sunday = new Date("2026-11-22T16:30:00Z");
  assert.deepEqual(boardWeek(sunday), {
    start: "2026-11-16",
    end: "2026-11-23",
    startsAt: "2026-11-15T17:00:00.000Z",
    endsAt: "2026-11-22T17:00:00.000Z",
  });
  assert.equal(boardWeek(sunday, 1).start, "2026-11-09");
  assert.equal(daysLeftInWeek(boardWeek(sunday), sunday), 1);
  const friday = new Date("2026-11-20T03:00:00Z");
  assert.equal(daysLeftInWeek(boardWeek(friday), friday), 3);
});

test("each assignment counts once at its best attempt, and only this week", () => {
  const week = boardWeek(new Date("2026-11-20T03:00:00Z"));
  const rows = rankBoard(
    ["a", "b", "c"],
    [
      { userId: "a", assignmentId: "x", score: 40, submittedAt: "2026-11-17T10:00:00Z" },
      { userId: "a", assignmentId: "x", score: 55, submittedAt: "2026-11-17T11:00:00Z" },
      { userId: "a", assignmentId: "y", score: 50, submittedAt: "2026-11-18T10:00:00Z" },
      { userId: "b", assignmentId: "z", score: 60, submittedAt: "2026-11-19T10:00:00Z" },
      { userId: "b", assignmentId: "w", score: 99, submittedAt: "2026-11-14T10:00:00Z" },
      { userId: "outsider", assignmentId: "q", score: 500, submittedAt: "2026-11-19T10:00:00Z" },
    ],
    week,
  );
  assert.deepEqual(rows, [
    { userId: "a", points: 105, activeDays: 2 },
    { userId: "b", points: 60, activeDays: 1 },
    { userId: "c", points: 0, activeDays: 0 },
  ]);
});

test("the board lists learners with points and the viewer, never others at zero or hidden", () => {
  const rows = [
    { userId: "lan", points: 12, activeDays: 3 },
    { userId: "hidden", points: 9, activeDays: 2 },
    { userId: "minh", points: 0, activeDays: 0 },
    { userId: "viewer", points: 0, activeDays: 0 },
  ];
  const isHidden = (userId: string) => userId === "hidden";
  assert.deepEqual(
    visibleBoardRows(rows, "viewer", isHidden).map((row) => row.userId),
    ["lan", "viewer"],
  );
  // A learner who hid themselves still sees their own row.
  assert.deepEqual(
    visibleBoardRows(rows, "hidden", isHidden).map((row) => row.userId),
    ["lan", "hidden"],
  );
});
