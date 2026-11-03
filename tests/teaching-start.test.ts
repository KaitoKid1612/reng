import assert from "node:assert/strict";
import { test } from "node:test";

import { buildStartSteps, classLessonState, showsStartSteps } from "../lib/teaching-start";

const LINKS = {
  newClass: "/teach/classes",
  newLesson: "/teach/lessons/new",
  lesson: "/teach/lessons/l1/edit",
  classContent: "/teach/lessons/l1/edit",
  invite: "/teach/classes/c1#join-code",
  schedule: "/teach/classes/c1#class-schedule",
  assign: "/teach/classes/c1/assign",
};

const NOTHING = {
  classCount: 0,
  lessonCount: 0,
  publishedLessonCount: 0,
  hasClassLesson: false,
  hasLearner: false,
  hasSchedule: false,
  hasAssignment: false,
};

test("a class uses the latest version, an older one, or not the lesson at all", () => {
  assert.equal(classLessonState(null, 3), "missing");
  assert.equal(classLessonState(2, 3), "older");
  assert.equal(classLessonState(3, 3), "latest");
});

test("a new teacher starts with every step open, in teaching order", () => {
  const steps = buildStartSteps(NOTHING, LINKS);
  assert.deepEqual(
    steps.map((step) => step.label),
    [
      "Tạo lớp học",
      "Tạo bài học",
      "Xuất bản bài",
      "Đưa bài vào lớp",
      "Mời học viên",
      "Đặt lịch học",
      "Giao bài tập",
    ],
  );
  assert.ok(steps.every((step) => !step.isDone));
});

test("steps are done from what the teacher already has", () => {
  const steps = buildStartSteps(
    { ...NOTHING, classCount: 1, lessonCount: 2, publishedLessonCount: 1, hasLearner: true },
    LINKS,
  );
  assert.deepEqual(
    steps.filter((step) => step.isDone).map((step) => step.label),
    ["Tạo lớp học", "Tạo bài học", "Xuất bản bài", "Mời học viên"],
  );
  assert.equal(
    steps.find((step) => step.label === "Giao bài tập")?.href,
    "/teach/classes/c1/assign",
  );
});

test("the steps hide once the teacher is teaching, even without a timetable", () => {
  const started = { ...NOTHING, classCount: 1, lessonCount: 1, publishedLessonCount: 1 };
  assert.equal(showsStartSteps(started, buildStartSteps(started, LINKS)), true);
  const teaching = { ...started, hasClassLesson: true, hasLearner: true, hasAssignment: true };
  assert.equal(showsStartSteps(teaching, buildStartSteps(teaching, LINKS)), false);
});
