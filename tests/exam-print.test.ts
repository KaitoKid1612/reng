import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildAnswerKey,
  buildAnswerSheet,
  buildListeningScript,
  buildQuestionBooklet,
  canPrintJlptExams,
  LEARNER_BOOKLETS,
  numberExamQuestions,
  parsePrintBooklet,
} from "@/lib/exam-print";
import { findJlptExamSet, JLPT_EXAM_SETS } from "@/lib/jlpt-exam-sets";

import type { LessonQuestion } from "@/lib/lesson-schema";

function choiceAnswer(question: LessonQuestion) {
  const [answer] = question.answer;
  assert.equal(typeof answer, "number", `${question.id} answers with an option`);
  return Number(answer);
}

test("booklets number questions like the real test and cover every question once", () => {
  const set = findJlptExamSet("n5-2018");
  assert.ok(set);
  const numbered = numberExamQuestions(set);
  const lastOf = (section: string) => numbered.filter((item) => item.section === section).at(-1);
  assert.equal(lastOf("vocabulary")?.label, "35");
  assert.equal(lastOf("grammarReading")?.label, "32");
  assert.equal(lastOf("listening")?.label, "6ばん");
  for (const exam of JLPT_EXAM_SETS) {
    const booklet = buildQuestionBooklet(exam);
    const printed = booklet.flatMap((section) =>
      section.mondai.flatMap((mondai) =>
        mondai.items.flatMap((block) => block.questions.map((question) => question.key)),
      ),
    );
    assert.deepEqual(
      printed,
      exam.questions.map((question) => question.id),
      exam.id,
    );
    // A test without listening (a book's written part) prints its two written sections only.
    const hasListening = exam.questions.some((question) => question.type === "listen");
    assert.deepEqual(
      booklet.map((section) => section.title),
      ["言語知識（文字・語彙）", "言語知識（文法）・読解", ...(hasListening ? ["聴解"] : [])],
      exam.id,
    );
    const sheetRows = buildAnswerSheet(exam).flatMap((section) =>
      section.mondai.flatMap((mondai) => mondai.items),
    );
    assert.equal(sheetRows.length, exam.questions.length);
  }
});

test("the learner's booklet and answer sheet never carry an answer, explanation or script", () => {
  const forbidden = ["answer", "explain", "transcript"];
  for (const set of JLPT_EXAM_SETS) {
    const learnerText = JSON.stringify([buildQuestionBooklet(set), buildAnswerSheet(set)]);
    for (const key of forbidden) {
      assert.ok(!learnerText.includes(`"${key}"`), `${set.id} learner booklet has ${key}`);
    }
    for (const question of set.questions) {
      assert.ok(!learnerText.includes(question.explain), `${set.id} ${question.id} explanation`);
    }
    const key = buildAnswerKey(set).flatMap((section) =>
      section.mondai.flatMap((mondai) => mondai.items),
    );
    assert.deepEqual(
      key.map((row) => row.answer),
      set.questions.map((question) => choiceAnswer(question) + 1),
    );
    const script = buildListeningScript(set).flatMap((section) =>
      section.mondai.flatMap((mondai) => mondai.items),
    );
    assert.equal(
      script.length,
      set.questions.filter((question) => question.type === "listen").length,
    );
    assert.ok(script.every((row) => row.transcript.length > 0));
  }
  assert.deepEqual([...LEARNER_BOOKLETS].sort(), ["answer-sheet", "questions"]);
  assert.equal(parsePrintBooklet("answers"), "answers");
  assert.equal(parsePrintBooklet("../etc"), "questions");
});

test("only a teacher who owns an active Japanese class may open the printed exams", () => {
  const japanese = { active: true, language_tag: "ja-JP" };
  assert.equal(canPrintJlptExams("teacher", [japanese]), true);
  assert.equal(canPrintJlptExams("student", [japanese]), false);
  assert.equal(canPrintJlptExams("teacher", []), false);
  assert.equal(canPrintJlptExams("teacher", [{ ...japanese, active: false }]), false);
  assert.equal(canPrintJlptExams("teacher", [{ active: true, language_tag: "zh-Hans" }]), false);
});
