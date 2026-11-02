import assert from "node:assert/strict";
import { test } from "node:test";

import {
  daysBefore,
  endOfVietnamDay,
  selectBalancedDailyQuestions,
  selectDailyQuestions,
  toVietnamDate,
} from "../lib/daily-practice";

test("practice days follow Vietnam time and end at 23:59:59 there", () => {
  assert.equal(toVietnamDate(new Date("2026-10-29T16:59:59Z")), "2026-10-29");
  assert.equal(toVietnamDate(new Date("2026-10-29T17:00:00Z")), "2026-10-30");
  assert.equal(endOfVietnamDay("2026-10-30"), "2026-10-30T16:59:59.000Z");
  assert.equal(daysBefore("2026-11-02", 14), "2026-10-19");
});

test("daily sets prefer unseen, then least recently used questions and stay stable per day", () => {
  const ids = ["q1", "q2", "q3", "q4", "q5", "q6"];
  const uses = [
    { questionId: "q1", practiceDate: "2026-10-28" },
    { questionId: "q2", practiceDate: "2026-10-27" },
    { questionId: "q2", practiceDate: "2026-10-28" },
    { questionId: "q3", practiceDate: "2026-10-26" },
  ];
  const today = selectDailyQuestions(ids, uses, 4, "class:2026-10-29");
  assert.equal(today.length, 4);
  assert.deepEqual(new Set(today.slice(0, 3)), new Set(["q4", "q5", "q6"]));
  assert.equal(today[3], "q3", "the oldest seen question comes next");
  assert.deepEqual(selectDailyQuestions(ids, uses, 4, "class:2026-10-29"), today);
  assert.deepEqual(selectDailyQuestions(["q1", "q1"], [], 5, "seed"), ["q1"]);
  const orders = new Set(
    ["a", "b", "c", "d"].map((seed) => selectDailyQuestions(ids, [], 6, seed).join()),
  );
  assert.ok(orders.size > 1, "unseen questions are ordered differently on different days");
});

function bank(kind: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${kind}-${index + 1}`,
    type: "fill",
    tags: [kind],
  }));
}

function countByPrefix(ids: readonly string[]) {
  const counts: Record<string, number> = {};
  for (const id of ids) {
    const prefix = id.split("-")[0] ?? "";
    counts[prefix] = (counts[prefix] ?? 0) + 1;
  }
  return counts;
}

test("daily sets keep each kind's share of the bank and skip the questions used yesterday", () => {
  // Shaped like the teacher's sheet bank: grammar, vocabulary, kanji, mixed.
  const candidates = [
    ...bank("grammar", 85),
    ...bank("vocab", 45),
    ...bank("kanji", 30),
    ...bank("mixed", 40),
  ];
  const yesterday = [
    ...bank("grammar", 25),
    ...bank("vocab", 15),
    ...bank("kanji", 10),
    ...bank("mixed", 10),
  ].map((item) => ({ questionId: item.id, practiceDate: "2026-10-30" }));
  const today = selectBalancedDailyQuestions(candidates, yesterday, 60, "class:2026-10-31");
  assert.equal(today.length, 60);
  assert.equal(new Set(today).size, 60);
  // 85/45/30/40 of 200 → 25.5/13.5/9/12; the extra question goes to the first kind in the lesson.
  assert.deepEqual(countByPrefix(today), { grammar: 26, vocab: 13, kanji: 9, mixed: 12 });
  const usedYesterday = new Set(yesterday.map((use) => use.questionId));
  assert.ok(
    today.every((id) => !usedYesterday.has(id)),
    "yesterday's set rotates to the back",
  );
  assert.deepEqual(
    selectBalancedDailyQuestions(candidates, yesterday, 60, "class:2026-10-31"),
    today,
    "the same day gives the same set",
  );
});

test("a Minna lesson mixes choice, fill and kanji reading; one kind keeps the old rotation", () => {
  const lesson = [
    ...Array.from({ length: 24 }, (_, index) => ({
      id: `choice-${index}`,
      type: "choice",
      tags: ["minna-12"],
    })),
    ...Array.from({ length: 14 }, (_, index) => ({
      id: `fill-${index}`,
      type: "fill",
      tags: ["minna-12"],
    })),
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `kanji-${index}`,
      type: "fill",
      tags: ["minna-12", "kanji", `kanji:v12${index}`],
    })),
  ];
  assert.deepEqual(countByPrefix(selectBalancedDailyQuestions(lesson, [], 10, "seed")), {
    choice: 5,
    fill: 3,
    kanji: 2,
  });
  const ids = ["q1", "q2", "q3", "q4", "q5", "q6"];
  const single = ids.map((id) => ({ id, type: "choice", tags: ["minna-11"] }));
  assert.deepEqual(
    selectBalancedDailyQuestions(single, [], 4, "class:2026-10-29"),
    selectDailyQuestions(ids, [], 4, "class:2026-10-29"),
  );
});
