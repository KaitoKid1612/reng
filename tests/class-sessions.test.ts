import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classSessionInputSchema,
  isFutureSession,
  MAX_SESSION_NOTES,
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
