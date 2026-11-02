import assert from "node:assert/strict";
import { test } from "node:test";

import {
  countOutcomes,
  matchesOutcome,
  numberAnswers,
  outcomeHref,
  parseAnswerOutcome,
} from "../lib/answer-outcome";

const answers = [
  { id: "q1", isCorrect: false },
  { id: "q2", isCorrect: true },
  { id: "q3", isCorrect: false },
];

test("the outcome filter keeps question numbers and counts every answer", () => {
  const wrong = numberAnswers(answers).filter(({ item }) =>
    matchesOutcome(item.isCorrect, "wrong"),
  );
  assert.deepEqual(
    wrong.map(({ item, number }) => [item.id, number]),
    [
      ["q1", 1],
      ["q3", 3],
    ],
  );
  assert.equal(
    numberAnswers(answers).filter(({ item }) => matchesOutcome(item.isCorrect, undefined)).length,
    3,
  );
  assert.deepEqual(countOutcomes(answers), { all: 3, correct: 1, wrong: 2 });
});

test("an unknown or repeated outcome shows everything, and links keep the path", () => {
  assert.equal(parseAnswerOutcome("wrong"), "wrong");
  assert.equal(parseAnswerOutcome("sai"), undefined);
  assert.equal(parseAnswerOutcome(["wrong", "correct"]), undefined);
  assert.equal(
    outcomeHref("/assignments/a/results", "correct"),
    "/assignments/a/results?outcome=correct",
  );
  assert.equal(outcomeHref("/assignments/a/results", undefined), "/assignments/a/results");
});
