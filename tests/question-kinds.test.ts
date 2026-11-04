import assert from "node:assert/strict";
import { test } from "node:test";

import { questionKind, summarizeQuestionKinds, weakestKind } from "../lib/question-kinds";

import type { QuestionKind } from "../lib/question-kinds";

const answers = (kind: QuestionKind, right: number, wrong: number) => [
  ...Array.from({ length: right }, () => ({ kind, isCorrect: true })),
  ...Array.from({ length: wrong }, () => ({ kind, isCorrect: false })),
];

test("a question about a passage is reading, dictation is listening, unknown types are left out", () => {
  assert.equal(questionKind("choice", true), "reading");
  assert.equal(questionKind("fill", false), "fill");
  assert.equal(questionKind("dictation", false), "listening");
  assert.equal(questionKind("listen", false), "listening");
  assert.equal(questionKind("essay", false), null);
});

test("kinds are summarized in a fixed order with rounded percentages", () => {
  const stats = summarizeQuestionKinds([...answers("fill", 2, 1), ...answers("choice", 9, 1)]);
  assert.deepEqual(
    stats.map((stat) => [stat.label, stat.answered, stat.correct, stat.percent]),
    [
      ["Trắc nghiệm", 10, 9, 90],
      ["Điền từ", 3, 2, 67],
    ],
  );
});

test("the weakest kind needs enough answers and something to compare with", () => {
  const stats = summarizeQuestionKinds([
    ...answers("choice", 18, 2),
    ...answers("fill", 6, 4),
    ...answers("order", 0, 3),
  ]);
  assert.equal(weakestKind(stats)?.kind, "fill");
  assert.equal(weakestKind(summarizeQuestionKinds(answers("fill", 1, 9))), null);
  assert.equal(
    weakestKind(summarizeQuestionKinds([...answers("choice", 5, 5), ...answers("fill", 5, 5)])),
    null,
  );
});
