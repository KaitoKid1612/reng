import assert from "node:assert/strict";
import { test } from "node:test";

import { summarizeGrammarWeakPoints } from "../lib/grammar-weak-points";

const answer = (tags: string[], isCorrect: boolean, day: number) => ({
  tags,
  isCorrect,
  answeredAt: `2026-11-${String(day).padStart(2, "0")}T12:00:00Z`,
});

test("points still wrong on the newest answer come first, then by share of wrong answers", () => {
  const points = summarizeGrammarWeakPoints([
    // Wrong twice, then right: put right since, so it drops below the ones still wrong.
    answer(["n4", "grammar:n4g-ba"], false, 10),
    answer(["grammar:n4g-ba"], false, 11),
    answer(["grammar:n4g-ba"], true, 12),
    // Wrong once in three, wrong on the newest answer.
    answer(["grammar:n4g-tara"], true, 10),
    answer(["grammar:n4g-tara"], true, 11),
    answer(["grammar:n4g-tara"], false, 12),
    // Wrong every time.
    answer(["grammar:n4g-nagara", "grammar:n4g-nagara"], false, 13),
    // Always right: not a weak point.
    answer(["grammar:n4g-te-oku"], true, 13),
    // No grammar tag.
    answer(["reading"], false, 13),
  ]);
  assert.deepEqual(points, [
    { id: "n4g-nagara", attempts: 1, wrong: 1, isLastCorrect: false },
    { id: "n4g-tara", attempts: 3, wrong: 1, isLastCorrect: false },
    { id: "n4g-ba", attempts: 3, wrong: 2, isLastCorrect: true },
  ]);
});

test("only points the class can open are listed, and the list is capped", () => {
  const answers = Array.from({ length: 12 }, (_, index) =>
    answer([`grammar:n4g-${index}`], false, 10),
  );
  assert.equal(summarizeGrammarWeakPoints(answers).length, 8);
  assert.deepEqual(
    summarizeGrammarWeakPoints(answers, new Set(["n4g-3", "n4g-x"])).map((point) => point.id),
    ["n4g-3"],
  );
});
