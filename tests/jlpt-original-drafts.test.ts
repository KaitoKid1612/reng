import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { JLPT_LEVELS } from "../lib/jlpt";
import {
  buildJlptDraftLesson,
  jlptDraftFileNames,
  jlptQuestionDraftSchema,
} from "../lib/jlpt-question-draft";

for (const level of JLPT_LEVELS) {
  test(`the ${level} original draft is valid and its generated lesson is current`, async () => {
    const files = jlptDraftFileNames(level);
    const draft = jlptQuestionDraftSchema.parse(JSON.parse(await readFile(files.source, "utf8")));
    const generated: unknown = JSON.parse(await readFile(files.generated, "utf8"));
    // A draft edited without `npm run jlpt:drafts` would leave a stale lesson behind.
    assert.deepEqual(generated, buildJlptDraftLesson(draft));
  });
}

const validQuestion = {
  id: "jlpt-n5-001",
  type: "choice",
  prompt: "「学校」の読み方を選んでください。",
  options: ["がっこう", "がこう", "かっこう", "がっこ"],
  answer: [0],
  multiple: false,
  points: 1,
  tags: ["kanji"],
  explain: "学校（がっこう）: trường học.",
};

function draftWith(questions: Record<string, unknown>[], fields: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    level: "N5",
    status: "draft",
    origin: "original",
    rights: "Reng original practice questions",
    reviewStatus: "needs-japanese-review",
    questions,
    ...fields,
  };
}

test("JLPT drafts accept only original single-answer questions that fit an exam section", () => {
  assert.equal(jlptQuestionDraftSchema.safeParse(draftWith([validQuestion])).success, true);
  const invalidDrafts = [
    draftWith([validQuestion], { origin: "official" }),
    draftWith([validQuestion], { status: "published" }),
    draftWith([validQuestion], { level: "N3" }),
    draftWith([]),
    draftWith([validQuestion, validQuestion]),
    draftWith([{ ...validQuestion, id: "jlpt-n4-001" }]),
    draftWith([{ ...validQuestion, answer: [4] }]),
    draftWith([{ ...validQuestion, answer: [0, 1], multiple: true }]),
    draftWith([{ ...validQuestion, options: ["がっこう", "がっこう"] }]),
    draftWith([{ ...validQuestion, tags: ["listening"] }]),
    draftWith([{ ...validQuestion, tags: ["kanji", "reading"] }]),
    draftWith([{ ...validQuestion, explain: " " }]),
    draftWith([{ ...validQuestion, audio: null }]),
    draftWith([validQuestion], { reviewStatus: "reviewed" }),
    draftWith([validQuestion], { reviewedAt: "2026-11-10" }),
    draftWith([validQuestion], { reviewStatus: "approved", reviewedAt: "2026-11-10" }),
  ];
  for (const draft of invalidDrafts) {
    assert.equal(jlptQuestionDraftSchema.safeParse(draft).success, false, JSON.stringify(draft));
  }
});

test("a generated JLPT draft lesson is assignable and says whether it was reviewed", () => {
  const waiting = buildJlptDraftLesson(jlptQuestionDraftSchema.parse(draftWith([validQuestion])));
  assert.deepEqual(waiting.questions, [validQuestion]);
  const [note] = waiting.slides;
  assert.ok(note.type === "note" && note.body.includes("chờ kiểm duyệt"));
  const reviewed = buildJlptDraftLesson(
    jlptQuestionDraftSchema.parse(
      draftWith([validQuestion], { reviewStatus: "reviewed", reviewedAt: "2026-11-10" }),
    ),
  );
  const [reviewedNote] = reviewed.slides;
  assert.ok(reviewedNote.type === "note" && reviewedNote.body.includes("đã duyệt"));
  assert.ok(reviewedNote.type === "note" && reviewedNote.body.includes("10/11/2026"));
});

test("a JLPT draft is refused where a review bank would be: furigana that shows the reading", () => {
  const draft = jlptQuestionDraftSchema.parse(
    draftWith([{ ...validQuestion, prompt: "「{学校|がっこう}」の読み方を選んでください。" }]),
  );
  assert.throws(() => buildJlptDraftLesson(draft), /furigana/);
});
