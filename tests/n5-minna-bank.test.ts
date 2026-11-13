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

const BANK_FILE = "content/review-banks/n5-minna-1-16.json";

async function loadBank() {
  return lessonDraftSchema.parse(JSON.parse(await readFile(BANK_FILE, "utf8")));
}

function lessonOf(tags: readonly string[]) {
  const tag = tags.find((item) => /^minna-\d+$/.test(item));
  return tag ? Number(tag.slice("minna-".length)) : 0;
}

test("the Minna 1–16 bank covers every lesson, newer lessons more, in four kinds of question", async () => {
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
    assert.ok(lesson >= 1 && lesson <= 16, `${question.id} names its lesson`);
    perLesson.set(lesson, (perLesson.get(lesson) ?? 0) + 1);
    types.add(question.type);
  }
  assert.deepEqual([...types].sort(), ["choice", "fill", "match", "order"]);
  // Lessons 1–10 have 24 lesson questions, 11–16 have 30; each adds 2 matching and 2 ordering.
  for (let lesson = 1; lesson <= 16; lesson += 1) {
    assert.ok((perLesson.get(lesson) ?? 0) >= (lesson <= 10 ? 28 : 34), `lesson ${lesson}`);
  }
});

test("every key of the Minna 1–16 bank is graded correct", async () => {
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
