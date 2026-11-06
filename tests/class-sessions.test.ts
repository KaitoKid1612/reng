import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classSessionInputSchema,
  describeAttendance,
  findFrequentAbsences,
  isFutureSession,
  MAX_SESSION_NOTES,
  parseSessionPrefill,
  sessionAttendanceInputSchema,
  sessionLogPath,
  slidePresenterPath,
} from "../lib/class-sessions";

const CLASS_ID = "00000000-0000-4000-8000-0000000000c1";

function parse(fields: Partial<Record<string, string>>) {
  return classSessionInputSchema.safeParse({
    classId: CLASS_ID,
    taughtOn: "2026-11-02",
    lessonId: "minna-12",
    slideReached: "24",
    notes: "  Ôn より và いちばん  ",
    ...fields,
  });
}

test("a logged session keeps its lesson, slide and trimmed notes", () => {
  const result = parse({});
  assert.ok(result.success);
  assert.deepEqual(result.data, {
    classId: CLASS_ID,
    taughtOn: "2026-11-02",
    lessonId: "minna-12",
    slideReached: 24,
    notes: "Ôn より và いちばん",
  });
  const free = parse({ lessonId: "", slideReached: "", notes: "" });
  assert.ok(free.success);
  assert.equal(free.data.lessonId, null);
  assert.equal(free.data.slideReached, null);
});

test("a session refuses a slide without its lesson, impossible slides and long notes", () => {
  assert.equal(parse({ lessonId: "" }).success, false);
  assert.equal(parse({ slideReached: "0" }).success, false);
  assert.equal(parse({ slideReached: "2.5" }).success, false);
  assert.equal(parse({ taughtOn: "02/11/2026" }).success, false);
  assert.equal(parse({ notes: "a".repeat(MAX_SESSION_NOTES + 1) }).success, false);
  assert.equal(isFutureSession("2026-11-03", "2026-11-02"), true);
  assert.equal(isFutureSession("2026-11-02", "2026-11-02"), false);
});

test("the presenter link reopens the logged slide of the logged version", () => {
  assert.equal(
    slidePresenterPath("minna-12", "00000000-0000-4000-8000-0000000000d1", 24),
    "/lessons/minna-12/slide?version=00000000-0000-4000-8000-0000000000d1#24",
  );
});

test("slides opened from a class link back to its log with the lesson and slide filled in", () => {
  const version = "00000000-0000-4000-8000-0000000000d1";
  assert.equal(
    slidePresenterPath("minna-12", version, 24, CLASS_ID),
    `/lessons/minna-12/slide?version=${version}&class=${CLASS_ID}#24`,
  );
  assert.equal(
    sessionLogPath(CLASS_ID, "minna-12", 31),
    `/teach/classes/${CLASS_ID}?lesson=minna-12&slide=31#class-sessions`,
  );
  const lessons = ["minna-11", "minna-12"];
  assert.deepEqual(parseSessionPrefill({ lesson: "minna-12", slide: "31" }, lessons), {
    lessonId: "minna-12",
    slide: 31,
  });
  assert.deepEqual(parseSessionPrefill({ lesson: "minna-12", slide: "0" }, lessons), {
    lessonId: "minna-12",
    slide: null,
  });
  assert.equal(parseSessionPrefill({ lesson: "other-lesson", slide: "3" }, lessons), null);
  assert.equal(parseSessionPrefill({ slide: "3" }, lessons), null);
  assert.equal(parseSessionPrefill({ lesson: ["minna-12", "minna-11"] }, lessons), null);
});

const CLASS = "00000000-0000-4000-8000-0000000000c1";
const SESSION = "00000000-0000-4000-8000-0000000000c2";
const AN = "00000000-0000-4000-8000-0000000000c3";
const BINH = "00000000-0000-4000-8000-0000000000c4";
const CHI = "00000000-0000-4000-8000-0000000000c5";

test("attendance marks every listed learner, and unticked learners are absent", () => {
  assert.deepEqual(
    sessionAttendanceInputSchema.parse({
      classId: CLASS,
      sessionId: SESSION,
      memberIds: [AN, BINH, CHI],
      presentIds: [AN, CHI, AN],
    }),
    { classId: CLASS, sessionId: SESSION, presentIds: [AN, CHI], absentIds: [BINH] },
  );
  // Everyone absent is a valid record; a ticked learner must be one of the listed learners.
  assert.deepEqual(
    sessionAttendanceInputSchema.parse({
      classId: CLASS,
      sessionId: SESSION,
      memberIds: [AN],
      presentIds: [],
    }).absentIds,
    [AN],
  );
  assert.equal(
    sessionAttendanceInputSchema.safeParse({
      classId: CLASS,
      sessionId: SESSION,
      memberIds: [AN],
      presentIds: [BINH],
    }).success,
    false,
  );
});

test("the log summarises a session and lists learners who miss sessions", () => {
  assert.equal(describeAttendance([]), "chưa ghi");
  assert.equal(
    describeAttendance([
      { userId: AN, isPresent: true },
      { userId: BINH, isPresent: false },
    ]),
    "có mặt 1/2",
  );
  // Chi joined after the first session, so only one session counts for Chi.
  assert.deepEqual(
    findFrequentAbsences([
      {
        marks: [
          { userId: AN, isPresent: false },
          { userId: BINH, isPresent: true },
        ],
      },
      { marks: [] },
      {
        marks: [
          { userId: AN, isPresent: false },
          { userId: BINH, isPresent: false },
          { userId: CHI, isPresent: false },
        ],
      },
    ]),
    [
      { userId: AN, absent: 2, marked: 2 },
      { userId: BINH, absent: 1, marked: 2 },
      { userId: CHI, absent: 1, marked: 1 },
    ],
  );
});
