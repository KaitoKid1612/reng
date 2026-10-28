import assert from "node:assert/strict";
import { test } from "node:test";

import rawDraft from "../content/lessons/lesson-01.json";
import {
  countMissingAudio,
  createItemId,
  createSlide,
  EMPTY_DRAFT_CONTENT,
  findPublishProblems,
  findReferencingSlides,
  parseLessonDraftState,
  toPublishableContent,
} from "../lib/lesson-draft";
import { lessonContentSchema } from "../lib/lesson-schema";

const sample = parseLessonDraftState({
  metadata: {
    title: rawDraft.title,
    titleJa: rawDraft.titleJa,
    summary: rawDraft.summary,
    order: rawDraft.order,
    courseId: rawDraft.courseId,
  },
  content: rawDraft.content,
});

test("published lessons load as drafts and publish to the same strict content", () => {
  assert.deepEqual(findPublishProblems(sample), []);
  assert.deepEqual(
    toPublishableContent(sample.content),
    lessonContentSchema.parse(rawDraft.content),
  );
  assert.equal(countMissingAudio(sample.content), 8);
});

test("unfinished drafts save but publishing explains every missing piece in Vietnamese", () => {
  const empty = parseLessonDraftState({
    metadata: { title: "", titleJa: "", summary: "", order: 6, courseId: "n5" },
    content: EMPTY_DRAFT_CONTENT,
  });
  assert.deepEqual(
    findPublishProblems(empty).map((problem) => problem.message),
    [
      "Nhập tiêu đề tiếng Việt.",
      "Nhập tiêu đề tiếng Nhật.",
      "Nhập tóm tắt bài.",
      "Bài cần ít nhất một slide.",
    ],
  );
  const broken = structuredClone(sample);
  broken.content.vocab[0].vi = " ";
  broken.content.slides.push({ id: "s-extra", type: "vocab", refs: ["v-missing"] });
  broken.content.slides.push(createSlide("image", "s-image"));
  const choice = broken.content.questions[0];
  assert.ok(choice.type === "choice");
  choice.answer = [];
  const messages = findPublishProblems(broken).map((problem) => problem.message);
  assert.ok(messages.includes("Từ vựng 1 (こんにちは): thiếu nghĩa tiếng Việt."));
  assert.ok(messages.includes("Câu luyện 1: chọn đáp án đúng trong các lựa chọn."));
  assert.ok(messages.some((message) => message.endsWith("có từ vựng không còn trong bài.")));
  assert.ok(messages.some((message) => message.includes("đường dẫn ảnh")));
});

test("references, identifiers and optional fields follow the content contract", () => {
  const vocabId = sample.content.vocab[0].id;
  assert.deepEqual(
    findReferencingSlides(sample.content, vocabId).map((slide) => slide.type),
    ["vocab"],
  );
  let call = 0;
  const repeating = () => [0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5][call++ % 12];
  const withFirst = structuredClone(sample.content);
  const firstId = createItemId("vocab", withFirst, repeating);
  withFirst.vocab.push({ ...withFirst.vocab[0], id: firstId });
  call = 0;
  const secondId = createItemId("vocab", withFirst, repeating);
  assert.match(firstId, /^v-[a-z2-9]{6}$/);
  assert.notEqual(secondId, firstId, "an existing ID is never handed out again");
  const blankOptional = structuredClone(sample);
  blankOptional.content.vocab[0].kanji = "";
  assert.equal("kanji" in toPublishableContent(blankOptional.content).vocab[0], false);
  assert.throws(() =>
    parseLessonDraftState({ ...sample, content: { ...sample.content, extra: true } }),
  );
});
