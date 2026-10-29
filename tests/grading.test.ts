import assert from "node:assert/strict";
import { test } from "node:test";

import { gradeAttempt, gradeQuestion, isPassingScore, toPercent } from "../lib/grading/grade";
import { normalizeAnswer } from "../lib/grading/normalize";
import { parseRawAnswer } from "../lib/grading/raw-answer";
import { questionSchema } from "../lib/lesson-schema";

const fill = questionSchema.parse({
  id: "f1",
  type: "fill",
  prompt: "がっこう___ いきます。",
  answer: ["行きます", "いきます"],
  explain: "Khai báo cả kanji và kana.",
  points: 2,
});
const multipleChoice = questionSchema.parse({
  id: "c1",
  type: "choice",
  prompt: "Chọn trợ từ đúng",
  options: ["へ", "を", "に", "で"],
  multiple: true,
  answer: [0, 2],
  explain: "へ và に đều chỉ hướng.",
  points: 1,
});
const match = questionSchema.parse({
  id: "m1",
  type: "match",
  prompt: "Ghép từ với nghĩa",
  left: ["いぬ", "ねこ"],
  right: ["mèo", "chó"],
  answer: [
    [0, 1],
    [1, 0],
  ],
  explain: "いぬ là chó.",
  points: 1,
});
const order = questionSchema.parse({
  id: "o1",
  type: "order",
  prompt: "Sắp xếp câu",
  tokens: [
    { id: "a", text: "わたし" },
    { id: "b", text: "は" },
    { id: "c", text: "がくせい" },
    { id: "d", text: "は" },
  ],
  answer: ["a", "b", "c", "d"],
  explain: "Token trùng chữ vẫn khác ID.",
  points: 1,
});

test("normalizes width and spacing without folding kana, kanji or long vowels", () => {
  assert.equal(normalizeAnswer(" ｲｷﾏｽ。"), "イキマス");
  assert.equal(normalizeAnswer("いき ます．"), "いきます");
  assert.equal(normalizeAnswer("はい、そうです。"), "はい、そうです");
  assert.notEqual(normalizeAnswer("おばさん"), normalizeAnswer("おばあさん"));
  assert.notEqual(normalizeAnswer("いきます"), normalizeAnswer("イキマス"));
});

test("fill answers accept only declared alternatives after normalization", () => {
  assert.equal(gradeQuestion(fill, "行きます。").isCorrect, true);
  assert.equal(gradeQuestion(fill, " いきます ").isCorrect, true);
  assert.equal(gradeQuestion(fill, "イキマス").isCorrect, false);
  assert.equal(gradeQuestion(fill, "ゆきます").isCorrect, false);
  assert.deepEqual(gradeQuestion(fill, "   "), { isCorrect: false, pointsEarned: 0 });
  assert.deepEqual(gradeQuestion(fill, undefined), { isCorrect: false, pointsEarned: 0 });
});

test("multiple choice compares complete sets regardless of selection order", () => {
  assert.equal(
    gradeQuestion(multipleChoice, parseRawAnswer(multipleChoice, [2, 0])).isCorrect,
    true,
  );
  assert.equal(gradeQuestion(multipleChoice, [0]).isCorrect, false);
  assert.equal(gradeQuestion(multipleChoice, [0, 1, 2]).isCorrect, false);
  assert.throws(() => parseRawAnswer(multipleChoice, [0, 0]));
  assert.throws(() => parseRawAnswer(multipleChoice, [4]));
  assert.throws(() => parseRawAnswer(multipleChoice, ["0"]));
  const single = questionSchema.parse({ ...multipleChoice, multiple: false, answer: [0] });
  assert.throws(() => parseRawAnswer(single, [0, 1]));
});

test("matching and ordering reject duplicates, unknown tokens and incomplete answers", () => {
  assert.equal(
    gradeQuestion(
      match,
      parseRawAnswer(match, [
        [1, 0],
        [0, 1],
      ]),
    ).isCorrect,
    true,
  );
  assert.equal(gradeQuestion(match, [[0, 1]]).isCorrect, false);
  assert.throws(() =>
    parseRawAnswer(match, [
      [0, 1],
      [0, 0],
    ]),
  );
  assert.throws(() => parseRawAnswer(match, [[2, 0]]));
  assert.equal(gradeQuestion(order, ["a", "b", "c", "d"]).isCorrect, true);
  assert.equal(gradeQuestion(order, ["a", "d", "c", "b"]).isCorrect, false);
  assert.throws(() => parseRawAnswer(order, ["a", "a"]));
  assert.throws(() => parseRawAnswer(order, ["z"]));
});

test("attempt scores use integer points and unrounded pass thresholds", () => {
  const grade = gradeAttempt([fill, multipleChoice, match], { f1: "いきます", c1: [1] });
  assert.equal(grade.score, 2);
  assert.equal(grade.maxScore, 4);
  assert.deepEqual(
    grade.results.map((result) => [result.questionId, result.isCorrect, result.raw]),
    [
      ["f1", true, "いきます"],
      ["c1", false, [1]],
      ["m1", false, null],
    ],
  );
  assert.equal(isPassingScore(2, 3, 67), false, "66.67% must not round up to 67%");
  assert.equal(isPassingScore(2, 3, 66), true);
  assert.equal(isPassingScore(7, 10, 70), true, "equal to the threshold passes");
  assert.equal(Math.round(toPercent(2, 3)), 67);
  assert.throws(() => gradeAttempt([], {}));
});

test("the Chinese grading profile keeps tones, spacing and scripts exactly", () => {
  assert.equal(normalizeAnswer(" nǐ hǎo ", "zh-exact-v1"), "nǐ hǎo");
  assert.notEqual(
    normalizeAnswer("nǐhǎo", "zh-exact-v1"),
    normalizeAnswer("nǐ hǎo", "zh-exact-v1"),
  );
  const decomposed = `ni${String.fromCodePoint(0x30c)}`;
  assert.equal(normalizeAnswer(decomposed, "zh-exact-v1"), "nǐ", "NFC composes tone marks");
  assert.equal(normalizeAnswer("いき ます。"), "いきます", "Japanese answers keep the v1 rules");

  const question = questionSchema.parse({
    id: "q1",
    type: "fill",
    prompt: "Viết pinyin của 你好",
    inputMode: "pinyin",
    gradingProfile: "zh-exact-v1",
    answer: ["nǐ hǎo"],
    explain: "nǐ hǎo",
    points: 1,
  });
  assert.equal(gradeQuestion(question, "nǐ hǎo").isCorrect, true);
  assert.equal(gradeQuestion(question, "ni hao").isCorrect, false, "tones are required");
  assert.equal(gradeQuestion(question, "nǐhǎo").isCorrect, false);
  const characters = questionSchema.parse({
    ...question,
    inputMode: "chinese",
    answer: ["谢谢"],
  });
  assert.equal(gradeQuestion(characters, "謝謝").isCorrect, false, "no script conversion");
  assert.equal(gradeQuestion(characters, "谢谢").isCorrect, true);
});
