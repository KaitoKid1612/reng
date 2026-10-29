import assert from "node:assert/strict";
import { test } from "node:test";

import {
  daysBefore,
  endOfVietnamDay,
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
