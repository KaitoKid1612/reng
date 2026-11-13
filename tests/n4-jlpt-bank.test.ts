import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { parseAssignableQuestion } from "../lib/assignment";
import { daysBefore, selectJlptDailyQuestions } from "../lib/daily-practice";
import { gradeQuestion } from "../lib/grading/grade";
import { findFuriganaProblems } from "../lib/lesson-draft";
import { lessonDraftSchema } from "../lib/lesson-schema";
import { JLPT_PARTS, jlptFullDailySize, jlptPartOf, planJlptDailyParts } from "../lib/jlpt-parts";

import type { DailyQuestionUse } from "../lib/daily-practice";

const BANK_FILE = "content/review-banks/n4-daily-with-listening.json";

async function loadBank() {
  return lessonDraftSchema.parse(JSON.parse(await readFile(BANK_FILE, "utf8")));
}

// Questions per passage in the parts that are asked on a text.
const GROUP_SIZES: Record<string, number> = {
  "text-grammar": 4,
  "short-reading": 1,
  "mid-reading": 3,
  "info-search": 2,
};

test("the N4 bank holds only exam-format questions, each in one part of the test", async () => {
  const bank = await loadBank();
  const questions = bank.content.questions;
  assert.ok(questions.length <= 500);
  assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
  assert.deepEqual(findFuriganaProblems(questions), []);
  const instructions = new Map<string, Set<string>>();
  const positions = new Map<string, number[]>();
  const passages = new Map<string, number>();
  for (const raw of questions) {
    const part = jlptPartOf(raw);
    assert.ok(part, `${raw.id} has no part`);
    const question = parseAssignableQuestion(raw);
    if (part.section === "listening") {
      assert.equal(question.type, "listen", raw.id);
      continue;
    }
    // The test is multiple choice only: one key among four options.
    assert.equal(question.type, "choice", raw.id);
    if (question.type !== "choice") {
      continue;
    }
    assert.equal(question.options.length, 4, raw.id);
    assert.equal(question.answer.length, 1, raw.id);
    assert.equal(gradeQuestion(question, question.answer).isCorrect, true, raw.id);
    const instruction = question.instruction ?? "";
    assert.ok(instruction.startsWith("もんだい"), raw.id);
    instructions.set(part.tag, (instructions.get(part.tag) ?? new Set()).add(instruction));
    const counts = positions.get(part.tag) ?? [0, 0, 0, 0];
    counts[question.answer[0]] += 1;
    positions.set(part.tag, counts);
    if (part.tag in GROUP_SIZES) {
      assert.ok(question.passage, raw.id);
      passages.set(question.passage, (passages.get(question.passage) ?? 0) + 1);
    }
  }
  for (const [tag, set] of instructions) {
    assert.equal(set.size, 1, `${tag} prints one instruction`);
  }
  // A key never sits mostly in one place, so position alone gives nothing away.
  for (const [tag, counts] of positions) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    assert.ok(
      counts.every((count) => count >= total * 0.18 && count <= total * 0.32),
      `${tag}: ${counts.join("/")}`,
    );
  }
  for (const question of questions) {
    const part = jlptPartOf(question);
    if (part && part.tag in GROUP_SIZES && "passage" in question && question.passage) {
      assert.equal(passages.get(question.passage), GROUP_SIZES[part.tag], question.id);
    }
  }
});

test("the N4 bank gives a full test-format set for a week without repeating a question", async () => {
  const bank = await loadBank();
  const candidates = bank.content.questions.map((question) => ({
    id: question.id,
    type: question.type,
    tags: question.tags,
    group: "passage" in question ? question.passage : undefined,
  }));
  const partOf = new Map(
    candidates.map((candidate) => [candidate.id, jlptPartOf(candidate)?.tag ?? ""]),
  );
  const size = jlptFullDailySize("N4");
  const expected = Object.fromEntries(
    planJlptDailyParts("N4", size, 10).map((item) => [item.part.tag, item.count]),
  );
  const uses: DailyQuestionUse[] = [];
  const seen = new Set<string>();
  for (let day = 0; day < 7; day += 1) {
    const practiceDate = `2026-11-${String(20 + day).padStart(2, "0")}`;
    const recent = uses.filter((use) => use.practiceDate >= daysBefore(practiceDate, 14));
    const ids = selectJlptDailyQuestions(
      candidates,
      recent,
      size,
      `class:${practiceDate}`,
      "N4",
      10,
    );
    assert.equal(ids.length, size);
    const counts: Record<string, number> = {};
    for (const id of ids) {
      const tag = partOf.get(id) ?? "";
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
    assert.deepEqual(counts, expected, practiceDate);
    const order = ids.map((id) => JLPT_PARTS.findIndex((part) => part.tag === partOf.get(id)));
    assert.deepEqual(
      order,
      [...order].sort((first, second) => first - second),
    );
    for (const id of ids) {
      const isListening = JLPT_PARTS.find((part) => part.tag === partOf.get(id))?.section;
      if (isListening !== "listening") {
        assert.equal(seen.has(id), false, `${id} came back on ${practiceDate}`);
      }
      seen.add(id);
      uses.push({ questionId: id, practiceDate });
    }
  }
});
