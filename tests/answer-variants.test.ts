import assert from "node:assert/strict";
import { test } from "node:test";

import {
  findRegradedSubmissions,
  isTypedQuestion,
  toAcceptedVariant,
} from "../lib/answer-variants";
import { parseAssignableQuestion } from "../lib/assignment";

const japanese = parseAssignableQuestion({
  id: "q-thanks",
  type: "fill",
  prompt: "Viết “cảm ơn” lịch sự.",
  inputMode: "hiragana",
  kanjiStrict: false,
  answer: ["ありがとうございます"],
  explain: "Cảm ơn lịch sự.",
  points: 2,
  tags: [],
});

test("an accepted answer regrades every equivalent answer under the question's own rules", () => {
  const rows = [
    { submission_id: "anna", raw: "ありがとう" },
    { submission_id: "binh", raw: " ありがとう。" },
    { submission_id: "chau", raw: "ありがと" },
    { submission_id: "dung", raw: [0] },
    { submission_id: "em", raw: null },
  ];
  assert.deepEqual(findRegradedSubmissions(japanese, "ありがとう", rows), ["anna", "binh"]);

  const chinese = parseAssignableQuestion({
    ...japanese,
    inputMode: "pinyin",
    answer: ["nǐ hǎo"],
    gradingProfile: "zh-exact-v1",
  });
  // Chinese answers keep tones and inner spacing: only the same writing counts.
  assert.deepEqual(
    findRegradedSubmissions(chinese, "nǐhǎo", [
      { submission_id: "a", raw: "nǐhǎo" },
      { submission_id: "b", raw: " nǐhǎo" },
      { submission_id: "c", raw: "nihao" },
      { submission_id: "d", raw: "nǐ  hǎo" },
    ]),
    ["a", "b"],
  );
  const vietnamese = parseAssignableQuestion({
    ...japanese,
    inputMode: "text",
    answer: ["cảm ơn"],
  });
  assert.deepEqual(
    findRegradedSubmissions(vietnamese, "Cám ơn", [{ submission_id: "a", raw: "cám ơn!" }]),
    ["a"],
  );
});

test("only typed answers can be accepted, and a kanji-strict question keeps needing kanji", () => {
  const strict = parseAssignableQuestion({
    ...japanese,
    inputMode: "japanese",
    kanjiStrict: true,
    answer: ["有難う"],
  });
  assert.throws(() => findRegradedSubmissions(strict, "ありがとう", []));
  assert.ok(isTypedQuestion({ type: "fill" }));
  assert.ok(isTypedQuestion({ type: "listen", responseType: "fill" }));
  assert.ok(!isTypedQuestion({ type: "listen", responseType: "choice" }));
  assert.ok(!isTypedQuestion({ type: "order" }));
  assert.equal(toAcceptedVariant("  ありがとう "), "ありがとう");
  assert.equal(toAcceptedVariant("   "), null);
  assert.equal(toAcceptedVariant([1]), null);
  assert.equal(toAcceptedVariant("あ".repeat(201)), null);
});
