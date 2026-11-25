import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { groupQuestionsForPicking, minnaLessonOf } from "../lib/question-groups";

const label = (type: string) => `dạng ${type}`;

test("a bank tagged by Minna lesson is grouped by lesson in lesson order, untagged questions last", () => {
  const groups = groupQuestionsForPicking(
    [
      { id: "a", type: "choice", tags: ["minna-10"] },
      { id: "b", type: "fill", tags: ["minna:2", "grammar"] },
      { id: "c", type: "choice", tags: ["reading"] },
      { id: "d", type: "choice", tags: ["MINNA-2"] },
    ],
    label,
  );
  assert.deepEqual(
    groups.map((group) => [group.label, group.questionIds]),
    [
      ["Bài 2", ["b", "d"]],
      ["Bài 10", ["a"]],
      ["Câu khác", ["c"]],
    ],
  );
});

test("a bank written in JLPT parts is grouped by part in test order, labelled in Japanese", () => {
  const groups = groupQuestionsForPicking(
    [
      { id: "g", type: "choice", tags: ["grammar-form"] },
      { id: "k", type: "choice", tags: ["kanji-reading"] },
      { id: "l", type: "listen", tags: ["section:1"] },
    ],
    label,
  );
  assert.deepEqual(
    groups.map((group) => [group.label, group.lang, group.questionIds]),
    [
      ["漢字読み", "ja", ["k"]],
      ["文法形式の判断", "ja", ["g"]],
      ["課題理解", "ja", ["l"]],
    ],
  );
});

test("a single Minna lesson or untagged bank falls back to question types in first-seen order", () => {
  const groups = groupQuestionsForPicking(
    [
      { id: "1", type: "fill", tags: ["minna-5"] },
      { id: "2", type: "choice", tags: ["minna-5"] },
      { id: "3", type: "fill", tags: ["minna-5"] },
    ],
    label,
  );
  assert.deepEqual(
    groups.map((group) => [group.label, group.questionIds]),
    [
      ["dạng fill", ["1", "3"]],
      ["dạng choice", ["2"]],
    ],
  );
  assert.equal(minnaLessonOf(["minna-n4"]), null);
});

test("the committed Minna 1–25 bank splits into its 25 lessons and keeps every question", async () => {
  const bank = JSON.parse(await readFile("content/review-banks/n5-minna-1-25.json", "utf8")) as {
    content: { questions: { id: string; type: string; tags?: string[] }[] };
  };
  const questions = bank.content.questions.map((question) => ({
    id: question.id,
    type: question.type,
    tags: question.tags ?? [],
  }));
  const groups = groupQuestionsForPicking(questions, label);
  assert.deepEqual(
    groups.map((group) => group.label),
    Array.from({ length: 25 }, (_, index) => `Bài ${index + 1}`),
  );
  assert.equal(
    groups.reduce((total, group) => total + group.questionIds.length, 0),
    questions.length,
  );
});
