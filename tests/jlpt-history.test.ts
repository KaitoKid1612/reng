import assert from "node:assert/strict";
import { test } from "node:test";

import { describeJlptOutcome, summarizeJlptHistory } from "../lib/jlpt-history";

import type { JlptSection } from "../lib/jlpt";

function answers(section: JlptSection, total: number, correct: number) {
  return Array.from({ length: total }, (_, index) => ({
    section,
    isCorrect: index < correct,
    pointsEarned: index < correct ? 1 : 0,
    points: 1,
  }));
}

const FIRST_N4 = {
  assignmentId: "a",
  title: "Thi thử N4 — 05/11",
  level: "N4" as const,
  submittedAt: "2026-11-05T10:00:00.000Z",
  items: [
    ...answers("vocabulary", 25, 15),
    ...answers("grammarReading", 25, 15),
    ...answers("listening", 20, 10),
  ],
};
const SECOND_N4 = {
  assignmentId: "b",
  title: "Thi thử N4 — 10/11",
  level: "N4" as const,
  submittedAt: "2026-11-10T10:00:00.000Z",
  items: [
    ...answers("vocabulary", 25, 25),
    ...answers("grammarReading", 25, 25),
    ...answers("listening", 20, 4),
  ],
};
const N5_WITHOUT_AUDIO = {
  assignmentId: "c",
  title: "Ôn N5 không có câu nghe",
  level: "N5" as const,
  submittedAt: "2026-11-08T10:00:00.000Z",
  items: [...answers("vocabulary", 10, 9), ...answers("grammarReading", 10, 8)],
};

test("mock exams read newest first, each compared with the earlier exam of its level", () => {
  const history = summarizeJlptHistory([FIRST_N4, SECOND_N4, N5_WITHOUT_AUDIO]);
  assert.deepEqual(
    history.map((entry) => [entry.assignmentId, entry.estimate?.total ?? null, entry.change]),
    [
      ["b", 132, 30],
      ["c", null, null],
      ["a", 102, null],
    ],
  );
  const [second, , first] = history;
  assert.equal(first?.estimate?.language, 72);
  assert.equal(first?.estimate?.listening, 30);
  assert.equal(describeJlptOutcome(first?.estimate ?? null), "Ước tính đỗ");
  assert.equal(
    describeJlptOutcome(second?.estimate ?? null),
    "Chưa đỗ: nghe hiểu dưới điểm sàn",
    "a total over the pass mark still fails on a section minimum",
  );
  assert.match(describeJlptOutcome(null), /Chưa ước tính được/);
});

test("a short total and a short section are both named", () => {
  const [entry] = summarizeJlptHistory([
    {
      ...FIRST_N4,
      items: [
        ...answers("vocabulary", 25, 5),
        ...answers("grammarReading", 25, 5),
        ...answers("listening", 20, 12),
      ],
    },
  ]);
  assert.equal(
    describeJlptOutcome(entry?.estimate ?? null),
    "Chưa đỗ: ngôn ngữ và đọc hiểu dưới điểm sàn, tổng dưới 90",
  );
});
