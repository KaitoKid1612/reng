import assert from "node:assert/strict";
import { test } from "node:test";

import { parseDatabaseVersion } from "../lib/lesson-repository";
import {
  createTeachingDraft,
  isTeachingVersion,
  reviewTeachingDraft,
  teachingDraftSchema,
  teachingPublishedContentSchema,
  toPublicTeachingLesson,
} from "../lib/teaching-content";
import {
  buildVocabularyQuestion,
  createReviewedQuestions,
  isQuestionReviewed,
  teachingReducer,
} from "../lib/teaching-draft";
import { parseVocabularyTable } from "../lib/teaching-table";
import { generateTeachingSlides } from "../lib/teaching-templates";

import type { TeachingDraft } from "../lib/teaching-content";

function buildDraft(): TeachingDraft {
  let draft = createTeachingDraft("Chào hỏi", "starter", "zh-Hans", "Chào và nói tên");
  const pasted = parseVocabularyTable(
    "Chữ Hán\tPinyin\tNghĩa\tCâu ví dụ\tPinyin câu ví dụ\tNghĩa câu ví dụ\n" +
      "你好\tnǐ hǎo\txin chào\t你好，老师！\tNǐ hǎo, lǎoshī!\tChào thầy/cô!\n" +
      "谢谢\txièxie\tcảm ơn\n" +
      "老师\tlǎoshī\tgiáo viên\n",
    draft.content.vocab,
  );
  draft = teachingReducer(draft, { type: "addVocabRows", rows: pasted.rows });
  const question = buildVocabularyQuestion(draft.content, "vocab-1", "meaning");
  assert.ok(question);
  return teachingReducer(draft, { type: "addQuestion", question });
}

test("pasted spreadsheet rows keep tones and scripts and report each line", () => {
  const result = parseVocabularyTable(
    "你好\tnǐ hǎo\txin chào\n" +
      "nǐ hǎo\t你好\txin chào\n" +
      "謝謝\t\tcảm ơn\n" +
      "你好\tnǐhǎo\tchào\n" +
      "\t\t\n" +
      "我\twǒ\t\n",
    [],
  );
  assert.equal(result.error, null);
  assert.deepEqual(
    result.rows.map((row) => [row.line, row.status]),
    [
      [1, "valid"],
      [2, "invalid"],
      [3, "valid"],
      [4, "duplicate"],
      [6, "invalid"],
    ],
  );
  assert.equal(result.rows[0].reading, "nǐ hǎo");
  assert.equal(result.rows[2].text, "謝謝", "traditional characters are never converted");
  assert.match(result.rows[2].warnings.join(), /pinyin/);
  assert.match(result.rows[1].problems.join(" "), /Cột 1/);
  assert.equal(parseVocabularyTable("x".repeat(60_000), []).rows.length, 0);
});

test("publishing requires objectives, slides and complete answers; missing pinyin only warns", () => {
  const empty = createTeachingDraft("", "starter", "zh-Hans", "");
  const emptyReport = reviewTeachingDraft(empty);
  assert.ok(emptyReport.problems.some((problem) => problem.includes("tiêu đề")));
  assert.ok(emptyReport.problems.some((problem) => problem.includes("mục tiêu")));
  assert.ok(emptyReport.problems.some((problem) => problem.includes("slide")));

  let draft = buildDraft();
  draft = teachingReducer(draft, {
    type: "applySlides",
    generation: generateTeachingSlides(draft),
  });
  assert.deepEqual(reviewTeachingDraft(draft).problems, []);
  assert.ok(teachingPublishedContentSchema.safeParse(draft.content).success);

  const withoutPinyin = teachingReducer(draft, {
    type: "updateVocab",
    id: "vocab-2",
    patch: { reading: "" },
  });
  const report = reviewTeachingDraft(withoutPinyin);
  assert.deepEqual(report.problems, []);
  assert.match(report.warnings.join(), /谢谢/);

  const question = draft.content.questions[0];
  const broken = teachingReducer(draft, {
    type: "updateQuestion",
    question: { ...question, explain: "" },
  });
  assert.ok(
    reviewTeachingDraft(broken).problems.some((problem) => problem.includes("Câu luyện 1")),
  );
});

test("slide generation is deterministic, ordered and keeps the teacher's edits", () => {
  const draft = buildDraft();
  const first = generateTeachingSlides(draft);
  assert.deepEqual(
    first.slides.map((slide) => slide.id),
    [
      "g-title",
      "g-goals",
      "g-vocab-vocab-1",
      "g-example-vocab-1-0",
      "g-vocab-vocab-2",
      "g-vocab-vocab-3",
      "g-quiz-question-1",
      "g-homework",
    ],
  );
  let current = teachingReducer(draft, { type: "applySlides", generation: first });
  const rerun = generateTeachingSlides(current);
  assert.deepEqual(rerun.changes, { added: [], updated: [], removed: [], preserved: [] });
  assert.equal(rerun.slides.length, first.slides.length, "regeneration never duplicates slides");

  const homework = current.content.slides.find((slide) => slide.id === "g-homework");
  const title = current.content.slides.find((slide) => slide.id === "g-title");
  assert.ok(homework?.type === "note" && title?.type === "title");
  current = teachingReducer(current, {
    type: "updateSlide",
    slide: { ...homework, body: "Viết 你好 năm lần." },
  });
  current = teachingReducer(current, {
    type: "updateSlide",
    slide: { ...title, teacherNotes: "Chào cả lớp" },
  });
  current = teachingReducer(current, {
    type: "removeItem",
    collection: "slides",
    id: "g-vocab-vocab-3",
  });
  current = teachingReducer(current, {
    type: "moveItem",
    collection: "slides",
    id: "g-goals",
    offset: -1,
  });
  current = teachingReducer(current, { type: "setTitle", title: "Chào hỏi cơ bản" });
  current = teachingReducer(current, { type: "addVocab" });
  current = teachingReducer(current, {
    type: "updateVocab",
    id: "vocab-4",
    patch: { text: "我", reading: "wǒ", meaning: "tôi" },
  });
  current = teachingReducer(current, { type: "removeItem", collection: "vocab", id: "vocab-2" });

  const update = generateTeachingSlides(current);
  const ids = update.slides.map((slide) => slide.id);
  assert.equal(ids[0], "g-goals", "the teacher's order is kept");
  assert.ok(!ids.includes("g-vocab-vocab-3"), "a slide the teacher deleted stays deleted");
  assert.ok(!ids.includes("g-vocab-vocab-2"), "a slide whose source was removed is dropped");
  assert.ok(ids.indexOf("g-vocab-vocab-4") < ids.indexOf("g-quiz-question-1"));
  assert.deepEqual(update.changes.preserved, ["g-homework"]);
  const editedHomework = update.slides.find((slide) => slide.id === "g-homework");
  assert.ok(editedHomework?.type === "note" && editedHomework.body === "Viết 你好 năm lần.");
  const newTitle = update.slides.find((slide) => slide.id === "g-title");
  assert.ok(newTitle?.type === "title" && newTitle.text === "Chào hỏi cơ bản");
  assert.equal(newTitle.teacherNotes, "Chào cả lớp", "notes survive regeneration");

  const replaced = generateTeachingSlides(current, true);
  assert.ok(
    replaced.slides.some((slide) => slide.id === "g-vocab-vocab-3"),
    "replacing edits also restores deleted generated slides",
  );
  const replacedHomework = replaced.slides.find((slide) => slide.id === "g-homework");
  assert.ok(replacedHomework?.type === "note" && replacedHomework.body !== "Viết 你好 năm lần.");
});

test("generated questions are editable frames and any edit invalidates a review", () => {
  const draft = buildDraft();
  const choice = draft.content.questions[0];
  assert.equal(choice.type, "choice");
  assert.ok(choice.type === "choice");
  assert.equal(choice.options[choice.answer[0]], "xin chào");
  const hanzi = buildVocabularyQuestion(draft.content, "vocab-3", "hanzi");
  assert.ok(hanzi?.type === "fill" && hanzi.inputMode === "chinese");
  assert.deepEqual(hanzi.answer, ["老师"]);
  const noReading = teachingReducer(draft, {
    type: "updateVocab",
    id: "vocab-3",
    patch: { reading: "" },
  });
  assert.equal(buildVocabularyQuestion(noReading.content, "vocab-3", "pinyin"), null);

  const reviewed = createReviewedQuestions(draft, [choice.id]);
  assert.ok(isQuestionReviewed(choice, reviewed));
  assert.ok(!isQuestionReviewed({ ...choice, explain: "Giải thích khác" }, reviewed));
  assert.ok(!isQuestionReviewed({ ...choice, prompt: `${choice.prompt}?` }, reviewed));
});

test("published v2 rows load as teaching versions and hide notes and answers", () => {
  let draft = buildDraft();
  draft = teachingReducer(draft, {
    type: "applySlides",
    generation: generateTeachingSlides(draft),
  });
  draft = teachingReducer(draft, {
    type: "updateSlide",
    slide: { id: "g-title", type: "title", text: "Chào hỏi", teacherNotes: "SECRET-NOTE" },
  });
  assert.ok(teachingDraftSchema.safeParse(draft).success);
  const version = parseDatabaseVersion({
    id: "00000000-0000-4000-8000-000000000010",
    lesson_id: "lesson-abc",
    version_no: 1,
    published_at: "2026-10-29T03:00:00.000+00:00",
    title: draft.title,
    title_ja: "",
    summary: "Chào và nói tên",
    order_no: 1,
    course_id: "chinese",
    is_sample: false,
    content: draft.content,
  });
  assert.ok(isTeachingVersion(version));
  const lesson = toPublicTeachingLesson(version);
  const serialized = JSON.stringify(lesson);
  assert.ok(!serialized.includes("SECRET-NOTE"));
  assert.ok(!("answer" in lesson.content.questions[0]));
  assert.ok(!("explain" in lesson.content.questions[0]));
});
