import assert from "node:assert/strict";
import { test } from "node:test";

import rawBank from "../content/review-banks/n4-comprehensive.json";
import { selectBalancedDailyQuestions } from "../lib/daily-practice";
import { gradeQuestion } from "../lib/grading/grade";
import { findPublishProblems, parseLessonDraftState } from "../lib/lesson-draft";
import { lessonDraftSchema } from "../lib/lesson-schema";

const bank = lessonDraftSchema.parse(rawBank);

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
  assert.equal(bank.content.questions.length, 200);
  assert.equal(new Set(bank.content.questions.map((question) => question.prompt)).size, 200);
  for (let lesson = 29; lesson <= 50; lesson += 1) {
    assert.ok(
      bank.content.questions.some((question) => question.tags.includes(`minna:${lesson}`)),
      `missing lesson ${lesson}`,
    );
  }
  for (const question of bank.content.questions) {
    if (question.type === "choice") {
      assert.equal(new Set(question.options).size, question.options.length);
      for (const [index] of question.options.entries()) {
        assert.equal(gradeQuestion(question, [index]).isCorrect, question.answer.includes(index));
      }
    } else {
      assert.ok(question.type === "fill");
      assert.equal(gradeQuestion(question, question.answer[0]).isCorrect, true);
      assert.equal(gradeQuestion(question, "không đúng").isCorrect, false);
    }
  }
});

test("the comprehensive bank rotates five balanced days before repeating", () => {
  const used: { questionId: string; practiceDate: string }[] = [];
  for (let day = 3; day <= 7; day += 1) {
    const practiceDate = `2026-11-0${day}`;
    const ids = selectBalancedDailyQuestions(bank.content.questions, used, 40, practiceDate);
    assert.equal(ids.length, 40);
    assert.ok(ids.every((id) => !used.some((use) => use.questionId === id)));
    for (const group of ["kanji", "forms", "grammar", "reading"]) {
      assert.equal(
        bank.content.questions.filter(
          (question) => ids.includes(question.id) && question.tags.includes(group),
        ).length,
        10,
      );
    }
    used.push(...ids.map((questionId) => ({ questionId, practiceDate })));
  }
  assert.equal(new Set(used.map((use) => use.questionId)).size, 200);
});
