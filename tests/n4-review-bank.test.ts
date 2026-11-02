import assert from "node:assert/strict";
import { test } from "node:test";

import supplement from "../content/review-banks/n4-minna-1-28-supplement.json";
import { selectBalancedDailyQuestions } from "../lib/daily-practice";
import { gradeQuestion } from "../lib/grading/grade";
import { lessonContentSchema } from "../lib/lesson-schema";

const content = lessonContentSchema.parse({
  schemaVersion: 1,
  ...supplement,
  grammar: [],
  slides: [{ id: "review-intro", type: "note", title: "Ôn tập", body: "Minna 1–28" }],
});

test("N4 supplement supports grading, vocabulary review and four rotating daily sets", () => {
  assert.equal(content.vocab.length, 40);
  assert.equal(content.questions.length, 160);
  assert.equal(new Set(content.questions.map((question) => question.prompt)).size, 160);
  for (const question of content.questions) {
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
  const used: { questionId: string; practiceDate: string }[] = [];
  for (let day = 3; day <= 6; day += 1) {
    const practiceDate = `2026-11-0${day}`;
    const ids = selectBalancedDailyQuestions(content.questions, used, 40, practiceDate);
    assert.equal(ids.length, 40);
    assert.ok(ids.every((id) => !used.some((use) => use.questionId === id)));
    used.push(...ids.map((questionId) => ({ questionId, practiceDate })));
  }
  assert.equal(new Set(used.map((use) => use.questionId)).size, 160);
});
