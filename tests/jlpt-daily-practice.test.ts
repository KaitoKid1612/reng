import assert from "node:assert/strict";
import { test } from "node:test";

import { daysBefore, selectJlptDailyQuestions } from "../lib/daily-practice";
import { jlptSectionOf } from "../lib/jlpt";
import {
  describeJlptDailyCoverage,
  JLPT_PARTS,
  jlptFullDailySize,
  jlptPartOf,
  planJlptDailyParts,
} from "../lib/jlpt-parts";

import type { DailyCandidate, DailyQuestionUse } from "../lib/daily-practice";

function countsOf(plan: ReturnType<typeof planJlptDailyParts>) {
  return Object.fromEntries(plan.map((item) => [item.part.tag, item.count]));
}

test("a full N4 daily set takes every language part of one test and ten listening questions", () => {
  assert.equal(jlptFullDailySize("N4"), 67);
  const plan = planJlptDailyParts("N4", 67, 10);
  assert.deepEqual(countsOf(plan), {
    "kanji-reading": 7,
    orthography: 5,
    contextual: 8,
    paraphrase: 4,
    usage: 4,
    "grammar-form": 13,
    composition: 4,
    "text-grammar": 4,
    "short-reading": 3,
    "mid-reading": 3,
    "info-search": 2,
    "listening-task": 3,
    "listening-point": 2,
    "listening-utterance": 2,
    "listening-response": 3,
  });
  assert.deepEqual(
    plan.map((item) => item.part.tag),
    JLPT_PARTS.map((part) => part.tag),
  );
});

test("an N5 daily set has no usage part and smaller sets keep the test's proportions", () => {
  assert.equal(jlptFullDailySize("N5"), 53);
  const n5 = planJlptDailyParts("N5", 53, 10);
  assert.equal(
    n5.some((item) => item.part.tag === "usage"),
    false,
  );
  assert.equal(
    n5.reduce((sum, item) => sum + item.count, 0),
    53,
  );
  const small = planJlptDailyParts("N4", 30, 0);
  assert.equal(
    small.reduce((sum, item) => sum + item.count, 0),
    30,
  );
  assert.equal(
    small.filter((item) => item.part.section === "listening").every((item) => item.count === 0),
    true,
  );
  // Without a listening count the set keeps the test's share of listening (28 of 85 at N4).
  const proportional = planJlptDailyParts("N4", 85, null);
  assert.deepEqual(
    proportional.map((item) => item.count),
    [7, 5, 8, 4, 4, 13, 4, 4, 3, 3, 2, 8, 7, 5, 8],
  );
});

test("bank questions name their part by tag, listening by its section tag", () => {
  assert.equal(jlptPartOf({ type: "choice", tags: ["n4", "usage", "usage"] })?.label, "用法");
  assert.equal(
    jlptPartOf({ type: "listen", tags: ["listening", "jlpt:n4", "section:3"] })?.tag,
    "listening-utterance",
  );
  assert.equal(jlptPartOf({ type: "listen", tags: ["listening"] }), null);
  // A listening tag on a reading question does not make it listening.
  assert.equal(jlptPartOf({ type: "choice", tags: ["listening-task"] }), null);
  assert.equal(jlptSectionOf({ type: "choice", tags: ["n4", "usage"] }), "vocabulary");
  assert.equal(
    jlptSectionOf({ type: "choice", tags: ["n4", "grammar", "text-grammar"], passage: "…" }),
    "grammarReading",
  );
});

// A bank with every part: two-question sheets for info-search, three-question passages for
// mid-reading, four-blank texts for text-grammar, and listening by section tag. A number gives
// every part that many questions; a function gives each part its own count.
function makeBank(perPart: number | ((tag: string) => number)) {
  const bank: DailyCandidate[] = [];
  JLPT_PARTS.forEach((part, partIndex) => {
    const groupSize = { "text-grammar": 4, "mid-reading": 3, "info-search": 2 }[part.tag] ?? 0;
    const count = typeof perPart === "number" ? perPart : perPart(part.tag);
    for (let index = 0; index < count; index += 1) {
      const isListening = part.section === "listening";
      bank.push({
        id: `${part.tag}-${index}`,
        type: isListening ? "listen" : "choice",
        tags: isListening ? ["listening", `section:${partIndex - 10}`] : ["n4", part.tag],
        group: groupSize ? `${part.tag}-passage-${Math.floor(index / groupSize)}` : undefined,
      });
    }
  });
  return bank;
}

function partOfId(id: string) {
  return JLPT_PARTS.findIndex((part) => id.startsWith(`${part.tag}-`));
}

test("a JLPT daily set follows the test order, keeps passages whole and rotates for days", () => {
  // A week's worth of each part, as the N4 bank is written.
  const weekly = countsOf(planJlptDailyParts("N4", 67, 10));
  const bank = makeBank((tag) => weekly[tag] * 7);
  const uses: DailyQuestionUse[] = [];
  const seen = new Set<string>();
  for (let day = 1; day <= 7; day += 1) {
    const practiceDate = `2026-11-${String(13 + day).padStart(2, "0")}`;
    const recent = uses.filter(
      (use) => use.practiceDate >= daysBefore(practiceDate, 14) && use.practiceDate < practiceDate,
    );
    const ids = selectJlptDailyQuestions(bank, recent, 67, `class:${practiceDate}`, "N4", 10);
    assert.equal(ids.length, 67);
    const parts = ids.map(partOfId);
    assert.deepEqual(
      parts,
      [...parts].sort((first, second) => first - second),
      "parts in test order, listening last",
    );
    // Each mid-reading passage comes whole (3 questions) and its questions sit together.
    const midGroups = ids
      .filter((id) => id.startsWith("mid-reading-"))
      .map((id) => bank.find((item) => item.id === id)?.group);
    assert.equal(new Set(midGroups).size, 1);
    for (const id of ids) {
      if (partOfId(id) < 11) {
        assert.equal(seen.has(id), false, `${id} repeated within a week`);
      }
      seen.add(id);
      uses.push({ questionId: id, practiceDate });
    }
  }
});

test("a part short of questions borrows from its own section, and listening 0 stays out", () => {
  const bank = makeBank(10).filter((item) => !item.id.startsWith("usage-"));
  bank.push({ id: "loose-1", type: "fill", tags: ["n4", "forms"] });
  const ids = selectJlptDailyQuestions(bank, [], 67, "seed", "N4", 0);
  assert.equal(
    ids.some((id) => partOfId(id) >= 11),
    false,
  );
  const vocabulary = ids.filter((id) => {
    const index = partOfId(id);
    return index >= 0 && JLPT_PARTS[index].section === "vocabulary";
  });
  // 57 language questions plus 10 that would have been listening come from language parts.
  assert.equal(ids.length, 67);
  assert.ok(vocabulary.length >= 28, "the four usage questions came from other vocabulary parts");
  assert.equal(new Set(ids).size, ids.length);
});

test("the class page coverage counts each part's questions in the source", () => {
  const coverage = describeJlptDailyCoverage("N4", 67, 10, makeBank(3));
  const kanji = coverage.find((row) => row.part.tag === "kanji-reading");
  assert.deepEqual(kanji && { count: kanji.count, available: kanji.available }, {
    count: 7,
    available: 3,
  });
});
