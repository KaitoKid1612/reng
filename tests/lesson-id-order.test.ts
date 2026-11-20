import assert from "node:assert/strict";
import { test } from "node:test";

import { readableLessonId } from "../lib/lesson-id";
import { compareLessons, courseGroupLabel } from "../lib/lesson-order";

test("a new lesson ID names its course and order and fits the lesson ID rule", () => {
  assert.equal(readableLessonId("minna-1", 18, "a8e144"), "minna-1-18-a8e144");
  assert.equal(readableLessonId("N4 Grammar!", 3, "00ff00"), "n4-grammar-3-00ff00");
  assert.equal(readableLessonId("", 0, "abcdef"), "lesson-1-abcdef");
  const random = readableLessonId("chinese", 7);
  assert.match(random, /^chinese-7-[0-9a-f]{6}$/);
  assert.notEqual(random, readableLessonId("chinese", 7));
  // lessonIdSchema: 3–64 characters, lowercase letters, digits and hyphens.
  const long = readableLessonId("x".repeat(80), 999, "abcdef");
  assert.ok(long.length <= 64);
  assert.match(long, /^[a-z0-9][a-z0-9-]*$/);
});

test("lessons sort by course in teaching order, then order in the course, then title", () => {
  const lessons = [
    { courseId: "n4-tips", orderNo: 1, title: "Mẹo N4 · 1" },
    { courseId: "n5", orderNo: 130, title: "Đề chính thức JLPT N5 (tập 2018)" },
    { courseId: "minna-1", orderNo: 10, title: "Bài 10" },
    { courseId: "n4", orderNo: 1, title: "Tổng ôn N4" },
    { courseId: "chinese", orderNo: 1, title: "Bài 1 tiếng Trung" },
    { courseId: "minna-2", orderNo: 26, title: "Bài 26" },
    { courseId: "n5", orderNo: 1, title: "Ôn Minna 1–17" },
    { courseId: "minna-1", orderNo: 2, title: "Bài 2" },
    { courseId: "n4-grammar", orderNo: 1, title: "Tổng ôn N4 · Bản đồ" },
    { courseId: "n5", orderNo: 1, title: "Ngân hàng ôn Minna N5" },
  ];
  assert.deepEqual(
    lessons.toSorted(compareLessons).map((lesson) => lesson.title),
    [
      "Bài 2",
      "Bài 10",
      "Bài 26",
      "Ngân hàng ôn Minna N5",
      "Ôn Minna 1–17",
      "Đề chính thức JLPT N5 (tập 2018)",
      "Tổng ôn N4",
      "Tổng ôn N4 · Bản đồ",
      "Mẹo N4 · 1",
      "Bài 1 tiếng Trung",
    ],
  );
});

test("each course group on the teacher's list has a readable heading", () => {
  assert.equal(courseGroupLabel("minna-1"), "Minna no Nihongo Sơ cấp I");
  assert.equal(courseGroupLabel("minna-2"), "Minna no Nihongo Sơ cấp II");
  assert.equal(courseGroupLabel("n5"), "JLPT N5");
  assert.equal(courseGroupLabel("n4"), "JLPT N4");
  assert.equal(courseGroupLabel("n4-grammar"), "Tổng ôn ngữ pháp N4");
  assert.equal(courseGroupLabel("n4-tips"), "Mẹo làm đề N4");
  assert.equal(courseGroupLabel("chinese"), "Bài soạn theo mẫu");
  assert.equal(courseGroupLabel("something-else"), "Bài khác");
});
