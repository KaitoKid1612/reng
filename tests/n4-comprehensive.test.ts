import assert from "node:assert/strict";
import { test } from "node:test";

import rawBank from "../content/review-banks/n4-comprehensive.json";
import { parseAssignableQuestion, toQuestionView } from "../lib/assignment";
import { dailyQuestionKind, selectBalancedDailyQuestions } from "../lib/daily-practice";
import { gradeQuestion } from "../lib/grading/grade";
import { findPublishProblems, parseLessonDraftState } from "../lib/lesson-draft";
import { lessonDraftSchema } from "../lib/lesson-schema";

const bank = lessonDraftSchema.parse(rawBank);
const questions = bank.content.questions;

// What the morning job hands to the selection: a passage groups its reading questions.
const candidates = questions.map((question) => ({
  id: question.id,
  type: question.type,
  tags: question.tags,
  group: question.passage,
}));
const kindOf = (id: string) => {
  const candidate = candidates.find((item) => item.id === id);
  assert.ok(candidate);
  return dailyQuestionKind(candidate, new Set(["n4"]));
};

// A kind's share of a 40-question day is its whole seats or one more: the leftover seats go
// to the kinds furthest behind their share of the recent sets, so they move from day to day.
const DAILY_KIND_COUNTS: Record<string, number> = {
  "fill|kanji": 7,
  "choice|kanji": 2,
  "choice|writing": 2,
  "choice|vocabulary": 2,
  "choice|paraphrase": 2,
  "fill|forms": 7,
  "fill|particles": 2,
  "choice|grammar": 7,
  "order|sentence-order": 3,
  "choice|reading": 6,
};

test("comprehensive N4 bank publishes within the editor limits and spans lessons 29–50", () => {
  assert.deepEqual(
    findPublishProblems(
      parseLessonDraftState({
        metadata: {
          title: bank.title,
          titleJa: bank.titleJa,
          summary: bank.summary,
          order: bank.order,
          courseId: bank.courseId,
        },
        content: bank.content,
      }),
    ),
    [],
  );
  assert.equal(bank.content.vocab.length, 80);
  assert.equal(questions.length, 304);
  const asked = questions.map((question) => `${question.passage ?? ""}\n${question.prompt}`);
  assert.equal(new Set(asked).size, questions.length);
  for (let lesson = 29; lesson <= 50; lesson += 1) {
    assert.ok(
      questions.some((question) => question.tags.includes(`minna:${lesson}`)),
      `missing lesson ${lesson}`,
    );
  }
});

test("every question is assignable and its declared answer is the only one graded right", () => {
  for (const raw of questions) {
    const question = parseAssignableQuestion(raw);
    if (question.type === "choice") {
      assert.equal(new Set(question.options).size, question.options.length);
      for (const [index] of question.options.entries()) {
        assert.equal(gradeQuestion(question, [index]).isCorrect, question.answer.includes(index));
      }
    } else if (question.type === "order") {
      assert.equal(gradeQuestion(question, question.answer).isCorrect, true, question.id);
      assert.equal(gradeQuestion(question, [...question.answer].reverse()).isCorrect, false);
      const view = toQuestionView(question);
      assert.ok(view.type === "order");
      assert.notDeepEqual(
        view.tokens.map((token) => token.id),
        question.answer,
      );
    } else {
      assert.ok(question.type === "fill");
      for (const answer of question.answer) {
        assert.equal(gradeQuestion(question, answer).isCorrect, true, question.id);
      }
      assert.equal(gradeQuestion(question, "không đúng").isCorrect, false);
    }
  }
});

test("reading questions carry their passage, five questions to a passage", () => {
  const reading = questions.filter((question) => question.tags.includes("reading"));
  assert.equal(reading.length, 50);
  assert.ok(reading.every((question) => question.passage && !question.prompt.includes("「")));
  const perPassage = new Map<string, number>();
  for (const question of reading) {
    perPassage.set(question.passage ?? "", (perPassage.get(question.passage ?? "") ?? 0) + 1);
  }
  assert.deepEqual([...perPassage.values()], Array(10).fill(5));
});

test("each day mixes all ten formats in a fixed order and keeps passages together", () => {
  const used: { questionId: string; practiceDate: string }[] = [];
  const kindOrder = Object.keys(DAILY_KIND_COUNTS);
  for (let day = 3; day <= 7; day += 1) {
    const practiceDate = `2026-11-0${day}`;
    const ids = selectBalancedDailyQuestions(candidates, used, 40, practiceDate);
    assert.equal(ids.length, 40);
    assert.ok(
      ids.every((id) => !used.some((use) => use.questionId === id)),
      practiceDate,
    );
    const kinds = ids.map(kindOf);
    for (const kind of Object.keys(DAILY_KIND_COUNTS)) {
      const exact = (candidates.filter((item) => kindOf(item.id) === kind).length / 304) * 40;
      const count = kinds.filter((item) => item === kind).length;
      assert.ok(
        count === Math.floor(exact) || count === Math.ceil(exact),
        `${practiceDate} ${kind}: ${count}`,
      );
    }
    // Vocabulary and kanji first, grammar next, reading last, as in the bank.
    assert.deepEqual([...new Set(kinds)], kindOrder);
    const passages = ids
      .map((id) => questions.find((question) => question.id === id)?.passage)
      .filter((passage): passage is string => Boolean(passage));
    const runs = passages.filter((passage, index) => passage !== passages[index - 1]);
    assert.equal(new Set(runs).size, runs.length, `${practiceDate}: a passage is split`);
    used.push(...ids.map((questionId) => ({ questionId, practiceDate })));
  }
});
