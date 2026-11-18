import assert from "node:assert/strict";
import { test } from "node:test";

import {
  countLiveChoices,
  pickLiveQuestions,
  rankLivePlayers,
  toLiveQuestion,
} from "../lib/live-quiz";

import type { LessonQuestion } from "../lib/lesson-schema";

const choice = (id: string, extra: Partial<LessonQuestion> = {}) =>
  ({
    id,
    type: "choice",
    prompt: `{本|ほん}（　　）あります。${id}`,
    options: ["が", "を", "に", "で"],
    multiple: false,
    answer: [0],
    explain: "あります đi với が.",
    points: 1,
    tags: [],
    ...extra,
  }) as LessonQuestion;

test("only single-choice questions a phone answers in one tap go into a round", () => {
  assert.deepEqual(toLiveQuestion(choice("q1")), {
    id: "q1",
    prompt: "{本|ほん}（　　）あります。q1",
    options: ["が", "を", "に", "で"],
    answer: 0,
    explain: "あります đi với が.",
  });
  assert.equal(toLiveQuestion(choice("q2", { multiple: true, answer: [0, 1] } as never)), null);
  assert.equal(toLiveQuestion(choice("q3", { passage: "Đoạn văn dài." })), null);
  assert.equal(
    toLiveQuestion({
      id: "q4",
      type: "fill",
      prompt: "Điền",
      inputMode: "hiragana",
      kanjiStrict: false,
      answer: ["が"],
      explain: "",
      points: 1,
      tags: [],
    } as LessonQuestion),
    null,
  );
});

test("a round draws one question from each stretch of the lesson, in lesson order", () => {
  const questions = Array.from({ length: 20 }, (_, index) => choice(`q${index + 1}`));
  const picked = pickLiveQuestions(questions, 5, () => 0.99);
  assert.deepEqual(
    picked.map((question) => question.id),
    ["q4", "q8", "q12", "q16", "q20"],
  );
  assert.equal(pickLiveQuestions(questions.slice(0, 3), 10).length, 3);
  assert.equal(pickLiveQuestions([], 5).length, 0);
});

test("players rank by points, then right answers, and equal scores share a rank", () => {
  const players = ["An", "Bình", "Chi", "Dũng"].map((name, index) => ({
    userId: `u${index}`,
    name,
    joinedAt: "2026-11-18T05:00:00Z",
  }));
  const answers = [
    { userId: "u0", questionIndex: 0, choice: 0, isCorrect: true, points: 900 },
    { userId: "u1", questionIndex: 0, choice: 0, isCorrect: true, points: 700 },
    { userId: "u2", questionIndex: 0, choice: 0, isCorrect: true, points: 700 },
    { userId: "u3", questionIndex: 0, choice: 2, isCorrect: false, points: 0 },
  ];
  assert.deepEqual(
    rankLivePlayers(players, answers).map(({ name, rank, points }) => [name, rank, points]),
    [
      ["An", 1, 900],
      ["Bình", 2, 700],
      ["Chi", 2, 700],
      ["Dũng", 4, 0],
    ],
  );
  assert.deepEqual(countLiveChoices(answers, 0, 4), [3, 0, 1, 0]);
});
