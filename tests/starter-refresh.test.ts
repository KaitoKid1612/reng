import assert from "node:assert/strict";
import { test } from "node:test";

import { parseLessonDraftState } from "../lib/lesson-draft";
import {
  findStarterForLesson,
  findStarterLesson,
  summarizeLessonContent,
} from "../lib/starter-lessons";

test("only a lesson created from a known starter can be refreshed from it", () => {
  assert.equal(findStarterForLesson("starter:minna-1-12")?.id, "minna-1-12");
  assert.equal(findStarterForLesson("starter:minna-9-99"), undefined);
  assert.equal(findStarterForLesson("0f3c2a"), undefined, "a shared copy or a new lesson");
  assert.equal(findStarterForLesson(null), undefined);
});

test("the comparison counts slides, questions and pictures of a draft and the starter", () => {
  const starter = findStarterLesson("minna-1-12");
  assert.ok(starter);
  const latest = summarizeLessonContent(starter.draft.content);
  assert.equal(latest.slides, starter.draft.content.slides.length);
  assert.equal(latest.questions, starter.draft.content.questions.length);
  assert.ok(latest.pictures > 40, "lesson 12 has vocabulary pictures and picture slides");

  // A draft made before the pictures existed: same text, no picture fields.
  const content = starter.draft.content;
  const older = parseLessonDraftState({
    metadata: { title: "Bài 12 — lớp tối", titleJa: "", summary: "", order: 12, courseId: "n5" },
    content: {
      ...content,
      vocab: content.vocab.map((item) => ({ ...item, image: undefined })),
      slides: content.slides
        .filter((slide) => slide.type !== "image")
        .map((slide) => (slide.type === "title" ? { ...slide, image: undefined } : slide)),
    },
  });
  const current = summarizeLessonContent(older.content);
  assert.equal(current.pictures, 0);
  assert.equal(current.questions, latest.questions);
  assert.ok(current.slides < latest.slides);
});
