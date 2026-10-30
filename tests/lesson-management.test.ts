import assert from "node:assert/strict";
import { test } from "node:test";

import { filterManagedLessons, parseLessonFilters } from "../lib/lesson-management";
import { lessonLanguage } from "../lib/teaching-language";

const lessons = [
  { id: "ja", title: "Bài 11 – Đếm người", languageTag: "ja-JP", publishedVersionId: "v1" },
  { id: "hans", title: "Chào hỏi 你好", languageTag: "zh-Hans", publishedVersionId: null },
  { id: "hant", title: "Chào hỏi 你好", languageTag: "zh-Hant", publishedVersionId: "v2" },
  { id: "unknown", title: "Nội dung mới", languageTag: null, publishedVersionId: null },
] as const;

test("lesson management combines title, script and publication filters without mixing scripts", () => {
  const filters = parseLessonFilters({ q: " CHÀO HỎI ", language: "zh-Hans", status: "draft" });
  assert.deepEqual(
    filterManagedLessons(lessons, filters).map((lesson) => lesson.id),
    ["hans"],
  );
  assert.deepEqual(
    filterManagedLessons(lessons, parseLessonFilters({ q: "你好", status: "published" })).map(
      (lesson) => lesson.id,
    ),
    ["hant"],
  );
  assert.deepEqual(
    filterManagedLessons(lessons, parseLessonFilters({ language: "ja-JP", status: "draft" })),
    [],
  );
  assert.equal(lessons.length, 4);
});

test("invalid lesson filters are safe and unknown schemas never become Japanese", () => {
  assert.deepEqual(parseLessonFilters({ q: ["bad"], language: "__proto__", status: "bad" }), {
    query: "",
    language: "all",
    status: "all",
  });
  assert.equal(parseLessonFilters({ q: "x".repeat(300) }).query.length, 160);
  assert.equal(lessonLanguage("1", null), "ja-JP");
  assert.equal(lessonLanguage("2", "zh-Hans"), "zh-Hans");
  assert.equal(lessonLanguage("2", "zh-Hant"), "zh-Hant");
  assert.equal(lessonLanguage("2", "ja-JP"), null);
  assert.equal(lessonLanguage("3", "zh-Hans"), null);
  assert.equal(lessonLanguage(null, null), null);
  assert.equal(filterManagedLessons(lessons, parseLessonFilters({})).length, 4);
});
