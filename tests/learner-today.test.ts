import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTodayPlan,
  describeDueReview,
  describeLessonOpened,
  describeTodayAssignment,
  MAX_TODAY_ASSIGNMENTS,
  MAX_TODAY_LESSONS,
  foldMissedDailySets,
  toTodayRows,
} from "../lib/learner-today";

import type { TodayAssignment, TodayInput, TodayLesson } from "../lib/learner-today";

// 2026-11-03 is a Tuesday. Times are written in Vietnam time (+07:00).
const at = (local: string) => new Date(`${local}+07:00`);
const iso = (local: string) => at(local).toISOString();
const now = at("2026-11-03T18:00:00");

const teacherClass = {
  id: "class-a",
  name: "Lớp A",
  isSelfStudy: false,
  slots: [{ weekday: 2, start: "19:30", minutes: 90 }],
};
const selfStudy = { id: "self", name: "Tự học", isSelfStudy: true, slots: [] };

function lesson(overrides: Partial<TodayLesson>): TodayLesson {
  return {
    classId: "class-a",
    lessonId: "lesson-1",
    versionId: "version-1",
    title: "Bài 1",
    orderNo: 1,
    availableAt: iso("2026-11-02T08:00:00"),
    ...overrides,
  };
}

function work(overrides: Partial<TodayAssignment>): TodayAssignment {
  return {
    id: "work",
    classId: "class-a",
    title: "Bài tập",
    dueAt: null,
    inProgress: false,
    isDaily: false,
    ...overrides,
  };
}

const empty: TodayInput = {
  classes: [teacherClass],
  openAssignments: [],
  lessons: [],
  readLessonIds: new Set(),
  dueCardCount: 0,
  dueMistakeCount: 0,
  hasMoreDueCards: false,
};

test("a session later today comes first; tomorrow's session and self-study classes do not", () => {
  const thursdayOnly = {
    ...teacherClass,
    id: "class-b",
    slots: [{ ...teacherClass.slots[0], weekday: 4 }],
  };
  const { items: plan } = buildTodayPlan(
    { ...empty, classes: [thursdayOnly, teacherClass, selfStudy], dueCardCount: 3 },
    now,
  );
  assert.deepEqual(plan[0], {
    kind: "session",
    classId: "class-a",
    className: "Lớp A",
    time: "19:30–21:00",
    isLive: false,
    meetingUrl: null,
  });
  assert.equal(plan.filter((item) => item.kind === "session").length, 1);
  const live = buildTodayPlan(empty, at("2026-11-03T20:00:00")).items[0];
  assert.equal(live?.kind === "session" && live.isLive, true);
  // Once the session ends, today has nothing left from the timetable.
  assert.deepEqual(buildTodayPlan(empty, at("2026-11-03T21:00:00")).items, []);
});

test("started work comes first, then work due today, then accepted late work", () => {
  const { items, moreAssignmentCount } = buildTodayPlan(
    {
      ...empty,
      classes: [{ ...teacherClass, slots: [] }],
      openAssignments: [
        work({ id: "today", dueAt: iso("2026-11-03T23:59:59") }),
        work({ id: "later", dueAt: iso("2026-11-10T23:59:00") }),
        work({ id: "open-ended" }),
        work({ id: "started", inProgress: true }),
        work({ id: "late", dueAt: iso("2026-11-02T23:59:00") }),
      ],
    },
    now,
  );
  assert.deepEqual(
    items.map((item) =>
      item.kind === "assignment" ? [item.assignmentId, item.isOverdue, item.className] : [],
    ),
    [
      ["started", false, "Lớp A"],
      ["today", false, "Lớp A"],
      ["late", true, "Lớp A"],
    ],
  );
  assert.equal(moreAssignmentCount, 0);
});

test("a daily set from an earlier day is skipped unless started, and today's work is capped", () => {
  const { items, moreAssignmentCount } = buildTodayPlan(
    {
      ...empty,
      classes: [{ ...teacherClass, slots: [] }],
      openAssignments: [
        work({ id: "daily-today", isDaily: true, dueAt: iso("2026-11-03T23:59:59") }),
        work({ id: "daily-yesterday", isDaily: true, dueAt: iso("2026-11-02T23:59:59") }),
        work({
          id: "daily-started",
          isDaily: true,
          dueAt: iso("2026-11-01T23:59:59"),
          inProgress: true,
        }),
        ...Array.from({ length: MAX_TODAY_ASSIGNMENTS }, (_, index) =>
          work({ id: `late-${index}`, dueAt: iso(`2026-10-2${index}T23:59:00`) }),
        ),
      ],
    },
    now,
  );
  assert.deepEqual(
    items.map((item) => (item.kind === "assignment" ? item.assignmentId : item.kind)),
    ["daily-started", "daily-today", "late-0"].slice(0, MAX_TODAY_ASSIGNMENTS),
  );
  assert.equal(moreAssignmentCount, MAX_TODAY_ASSIGNMENTS - 1);
});

test("unread lessons a teacher opened this week are new; read, old and future lessons are not", () => {
  const plan = buildTodayPlan(
    {
      ...empty,
      classes: [{ ...teacherClass, slots: [] }],
      lessons: [
        lesson({ lessonId: "older", orderNo: 1, availableAt: iso("2026-10-20T08:00:00") }),
        lesson({ lessonId: "read", orderNo: 2, availableAt: iso("2026-11-01T08:00:00") }),
        lesson({ lessonId: "monday", orderNo: 3, availableAt: iso("2026-11-02T08:00:00") }),
        lesson({ lessonId: "today", orderNo: 4, availableAt: iso("2026-11-03T08:00:00") }),
        lesson({ lessonId: "friday", orderNo: 5, availableAt: iso("2026-11-06T08:00:00") }),
      ],
      readLessonIds: new Set(["read"]),
    },
    now,
  );
  assert.deepEqual(
    plan.items.map((item) => (item.kind === "lesson" ? item.lessonId : item.kind)),
    ["today", "monday"],
  );
});

test("a self-study class suggests only its next unread lesson, after a teacher's new lessons", () => {
  const plan = buildTodayPlan(
    {
      ...empty,
      classes: [{ ...teacherClass, slots: [] }, selfStudy],
      lessons: [
        lesson({
          classId: "self",
          lessonId: "self-1",
          orderNo: 1,
          availableAt: iso("2026-09-01T08:00:00"),
        }),
        lesson({
          classId: "self",
          lessonId: "self-2",
          orderNo: 2,
          availableAt: iso("2026-09-01T08:00:00"),
        }),
        lesson({
          classId: "self",
          lessonId: "self-3",
          orderNo: 3,
          availableAt: iso("2026-09-01T08:00:00"),
        }),
        lesson({ lessonId: "teacher-new" }),
      ],
      readLessonIds: new Set(["self-1"]),
    },
    now,
  );
  assert.deepEqual(
    plan.items.map((item) => (item.kind === "lesson" ? [item.lessonId, item.isSelfStudy] : [])),
    [
      ["teacher-new", false],
      ["self-2", true],
    ],
  );
});

test("new lessons are capped, and due review cards close the list", () => {
  const lessons = Array.from({ length: MAX_TODAY_LESSONS + 2 }, (_, index) =>
    lesson({ lessonId: `lesson-${index}`, orderNo: index + 1 }),
  );
  const plan = buildTodayPlan(
    {
      ...empty,
      classes: [{ ...teacherClass, slots: [] }],
      lessons,
      dueCardCount: 50,
      dueMistakeCount: 12,
      hasMoreDueCards: true,
    },
    now,
  );
  assert.equal(plan.items.filter((item) => item.kind === "lesson").length, MAX_TODAY_LESSONS);
  assert.deepEqual(plan.items.at(-1), {
    kind: "review",
    count: 50,
    mistakeCount: 12,
    hasMore: true,
  });
});

test("the review row names vocabulary cards, mistakes or both", () => {
  assert.deepEqual(describeDueReview(12, 0, false), {
    title: "Thẻ từ vựng đến hạn",
    meta: "12 thẻ",
  });
  assert.deepEqual(describeDueReview(5, 5, false), { title: "Câu sai cần ôn lại", meta: "5 câu" });
  assert.deepEqual(describeDueReview(17, 5, false), {
    title: "Thẻ ôn tập đến hạn",
    meta: "12 từ vựng, 5 câu sai",
  });
  assert.deepEqual(describeDueReview(50, 12, true), {
    title: "Thẻ ôn tập đến hạn",
    meta: "50+ thẻ, gồm từ vựng và câu sai",
  });
  const [row] = toTodayRows(
    [{ kind: "review", count: 5, mistakeCount: 5, hasMore: false }],
    now,
    false,
  );
  assert.equal(row?.title, "Câu sai cần ôn lại");
  assert.equal(row?.href, "/review");
});

test("work in the plan says when it is due, in Vietnam time", () => {
  const base = {
    kind: "assignment" as const,
    assignmentId: "a",
    className: "Lớp A",
    title: "Bài",
    isOverdue: false,
    inProgress: false,
  };
  assert.equal(
    describeTodayAssignment({ ...base, dueAt: iso("2026-11-03T23:59:59") }, now),
    "Hạn hôm nay, 23:59",
  );
  assert.match(
    describeTodayAssignment({ ...base, dueAt: iso("2026-11-02T21:00:00"), isOverdue: true }, now),
    /^Quá hạn từ .*21:00.*, vẫn nộp được$/,
  );
  assert.equal(
    describeTodayAssignment({ ...base, dueAt: null, inProgress: true }, now),
    "Đang làm dở",
  );
  assert.match(
    describeTodayAssignment({ ...base, dueAt: iso("2026-11-10T08:00:00"), inProgress: true }, now),
    /^Đang làm dở · Hạn .*08:00/,
  );
});

test("a new lesson says which Vietnam day it opened", () => {
  assert.equal(describeLessonOpened(iso("2026-11-03T00:30:00"), now), "Mở hôm nay");
  // 23:30 on 2 November in Vietnam is still 2 November there, though UTC has moved on.
  assert.equal(describeLessonOpened(iso("2026-11-02T23:30:00"), now), "Mở hôm qua");
  assert.equal(describeLessonOpened(iso("2026-10-28T08:00:00"), now), "Mở ngày 28/10");
});

test("a live session with a Meet link opens the call; without one it opens the class", () => {
  const live = at("2026-11-03T20:00:00");
  const withMeet = buildTodayPlan(
    {
      ...empty,
      classes: [{ ...teacherClass, meetingUrl: "https://meet.google.com/abc-defg-hij" }],
    },
    live,
  ).items;
  const [meetRow] = toTodayRows(withMeet, live, false);
  assert.equal(meetRow?.action, "Vào Google Meet");
  assert.equal(meetRow?.actionHref, "https://meet.google.com/abc-defg-hij");
  assert.equal(meetRow?.isExternal, true);
  assert.equal(meetRow?.href, "/classes/class-a");
  const [classRow] = toTodayRows(buildTodayPlan(empty, live).items, live, false);
  assert.equal(classRow?.action, "Vào lớp");
  assert.equal(classRow?.actionHref, undefined);
});

test("missed daily sets fold into a count per class; started and current ones stay listed", () => {
  const entry = (id: string, classId: string, dueAt: string | null, status = "not_started") => ({
    assignment: { id, classId, dueAt },
    status,
  });
  const { listed, missed } = foldMissedDailySets(
    [
      entry("today", "a", iso("2026-11-03T23:59:59")),
      entry("mon", "a", iso("2026-11-02T23:59:59")),
      entry("sun", "a", iso("2026-11-01T23:59:59")),
      entry("started", "a", iso("2026-10-31T23:59:59"), "in_progress"),
      entry("homework", "a", iso("2026-11-01T23:59:00")),
      entry("other-class", "b", iso("2026-11-02T23:59:59")),
    ],
    new Set(["today", "mon", "sun", "started", "other-class"]),
    now,
  );
  assert.deepEqual(
    listed.map((item) => item.assignment.id),
    ["today", "started", "homework"],
  );
  assert.deepEqual(
    [...missed],
    [
      ["a", 2],
      ["b", 1],
    ],
  );
});
