import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { parseAssignableQuestion } from "../lib/assignment";
import { daysBefore, selectDailyQuestionsWithListeningQuota } from "../lib/daily-practice";
import { gradeQuestion } from "../lib/grading/grade";
import { findFuriganaProblems } from "../lib/lesson-draft";
import { lessonDraftSchema } from "../lib/lesson-schema";
import { findBankLanguageProblems } from "../lib/review-bank";

import type { DailyQuestionUse } from "../lib/daily-practice";

const BANK_FILE = "content/review-banks/n5-minna-1-25.json";

async function loadBank() {
  return lessonDraftSchema.parse(JSON.parse(await readFile(BANK_FILE, "utf8")));
}

function lessonOf(tags: readonly string[]) {
  const tag = tags.find((item) => /^minna-\d+$/.test(item));
  return tag ? Number(tag.slice("minna-".length)) : 0;
}

test("the Minna 1–25 bank covers every lesson, lessons 17–25 more, in four kinds of question", async () => {
  const bank = await loadBank();
  const questions = bank.content.questions;
  assert.equal(questions.length, 500);
  assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
  assert.deepEqual(findFuriganaProblems(questions), []);
  assert.deepEqual(findBankLanguageProblems(bank.content, "ja-JP"), []);
  const perLesson = new Map<number, number>();
  const types = new Set<string>();
  for (const question of questions) {
    const lesson = lessonOf(question.tags);
    assert.ok(lesson >= 1 && lesson <= 25, `${question.id} names its lesson`);
    perLesson.set(lesson, (perLesson.get(lesson) ?? 0) + 1);
    types.add(question.type);
  }
  assert.deepEqual([...types].sort(), ["choice", "fill", "match", "order"]);
  // Lessons 1–10 keep 13 lesson questions, 11–16 keep 14 and 17–25 have 18; each adds 2
  // matching and 2 ordering questions, and some lessons a short reading.
  const leastPerLesson = (lesson: number) => {
    if (lesson <= 10) {
      return 17;
    }
    return lesson <= 16 ? 18 : 22;
  };
  for (let lesson = 1; lesson <= 25; lesson += 1) {
    assert.ok((perLesson.get(lesson) ?? 0) >= leastPerLesson(lesson), `lesson ${lesson}`);
  }
});

test("the keys of each lesson's choice questions spread over the four positions", async () => {
  const bank = await loadBank();
  const positions = new Map<number, number[]>();
  for (const question of bank.content.questions) {
    if (question.type === "choice" && question.answer.length === 1) {
      const counts = positions.get(lessonOf(question.tags)) ?? [0, 0, 0, 0];
      counts[question.answer[0]] += 1;
      positions.set(lessonOf(question.tags), counts);
    }
  }
  // Options keep their order on screen; the same rule as the N4 bank.
  for (const [lesson, counts] of positions) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    assert.ok(
      counts.every((count) => count >= total * 0.18 && count <= total * 0.32),
      `lesson ${lesson}: ${counts.join("/")}`,
    );
  }
});

test("every key of the Minna 1–25 bank is graded correct", async () => {
  const bank = await loadBank();
  for (const raw of bank.content.questions) {
    const question = parseAssignableQuestion(raw);
    if (question.type === "choice" || question.type === "order") {
      assert.equal(gradeQuestion(question, question.answer).isCorrect, true, raw.id);
    } else if (question.type === "fill") {
      for (const answer of question.answer) {
        assert.equal(gradeQuestion(question, answer).isCorrect, true, raw.id);
      }
    } else if (question.type === "match") {
      assert.equal(gradeQuestion(question, question.answer).isCorrect, true, raw.id);
      // The right column is shuffled: no item sits beside its partner in every row.
      assert.ok(
        question.answer.some(([left, right]) => left !== right),
        `${raw.id} shows the pairs in order`,
      );
    }
  }
});

test("sixty questions a day go eight days without a repeat and reach every question", async () => {
  const bank = await loadBank();
  const candidates = bank.content.questions.map((question) => ({
    id: question.id,
    type: question.type,
    tags: question.tags,
    group: "passage" in question ? question.passage : undefined,
  }));
  const uses: DailyQuestionUse[] = [];
  for (let day = 0; day < 9; day += 1) {
    const practiceDate = `2026-11-${String(14 + day).padStart(2, "0")}`;
    const recent = uses.filter((use) => use.practiceDate >= daysBefore(practiceDate, 14));
    const ids = selectDailyQuestionsWithListeningQuota(
      candidates,
      recent,
      60,
      `class:${practiceDate}`,
      0,
    );
    assert.equal(ids.length, 60);
    if (day < 8) {
      assert.ok(
        ids.every((id) => !uses.some((use) => use.questionId === id)),
        `${practiceDate} repeats a question`,
      );
    }
    uses.push(...ids.map((questionId) => ({ questionId, practiceDate })));
  }
  assert.equal(new Set(uses.map((use) => use.questionId)).size, candidates.length);
});
