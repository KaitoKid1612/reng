import assert from "node:assert/strict";
import { test } from "node:test";

import rawDraft from "../content/lessons/lesson-01.json";
import {
  describeCorrectAnswer,
  describeRawAnswer,
  parseAssignableQuestion,
  parseViewAnswer,
  toQuestionView,
  toStoredRawAnswer,
  toTestQuestions,
} from "../lib/assignment";
import { fromQuestionDraft, toQuestionDraft } from "../lib/editor-questions";
import { gradeQuestion } from "../lib/grading/grade";
import {
  findPublishProblems,
  parseLessonDraftState,
  toPublishableContent,
} from "../lib/lesson-draft";
import {
  describeMatchProblem,
  fromMatchColumns,
  toMatchColumns,
  toMatchQuestion,
} from "../lib/match-pairs";
import { describeQuestionProblem, toTestQuestionInput } from "../lib/test-question-draft";

import type { DraftMatchQuestion } from "../lib/lesson-draft";

const ROWS = [
  { left: "{名前|なまえ}", right: "tên" },
  { left: "{学生|がくせい}", right: "học sinh" },
  { left: "{先生|せんせい}", right: "giáo viên" },
  { left: "{会社員|かいしゃいん}", right: "nhân viên công ty" },
];

function assignable(rows = ROWS) {
  return parseAssignableQuestion({
    id: "q-match",
    type: "match",
    prompt: "Ghép từ với nghĩa.",
    ...toMatchQuestion(rows),
    explain: "名前 là tên.",
    points: 1,
    tags: [],
  });
}

test("a stored matching question keeps its pairs but not the typed order of the right column", () => {
  const stored = toMatchQuestion(ROWS);
  assert.deepEqual(
    stored.left,
    ROWS.map((row) => row.left),
  );
  assert.notDeepEqual(
    stored.right,
    ROWS.map((row) => row.right),
    "the right column is shuffled",
  );
  for (const [left, right] of stored.answer) {
    assert.equal(stored.right[right], ROWS[left]?.right, "each pair still joins the typed rows");
  }
  assert.ok(stored.answer.some(([left, right]) => left !== right));
  assert.deepEqual(toMatchQuestion(ROWS), stored, "the same rows publish the same question");
  assert.deepEqual(toMatchColumns(stored), {
    left: ROWS.map((row) => row.left),
    right: ROWS.map((row) => row.right),
  });
});

test("learners get the right column shuffled, without answers, and their pairs are graded", () => {
  const question = assignable();
  if (question.type !== "match") {
    throw new Error("expected a matching question");
  }
  const view = toQuestionView(question);
  assert.equal(view.type, "match");
  assert.ok(!("answer" in view) && !("explain" in view));
  if (view.type !== "match") {
    return;
  }
  assert.deepEqual(
    [...view.right.map((option) => option.index)].sort(),
    question.right.map((_, index) => index),
  );
  assert.ok(
    view.right.some(
      (option, row) => !question.answer.some(([left, r]) => left === row && r === option.index),
    ),
    "the menu order is not the answer",
  );

  const correct = question.answer.map(([left, right]): [number, number] => [left, right]);
  assert.equal(gradeQuestion(question, correct).isCorrect, true);
  assert.equal(gradeQuestion(question, correct.slice(1)).isCorrect, false, "every row is needed");
  const swapped = correct.map(([left], index): [number, number] => [
    left,
    correct[(index + 1) % correct.length]?.[1] ?? 0,
  ]);
  assert.equal(gradeQuestion(question, swapped).isCorrect, false);

  // A learner may leave rows empty while working, but never use one item twice.
  assert.deepEqual(parseViewAnswer(view, [[0, 2]]), [[0, 2]]);
  assert.throws(() =>
    parseViewAnswer(view, [
      [0, 2],
      [1, 2],
    ]),
  );
  assert.throws(() => parseViewAnswer(view, [[0, 9]]));

  assert.deepEqual(toStoredRawAnswer(correct), correct);
  assert.equal(
    describeCorrectAnswer(question),
    "{名前|なまえ} → tên · {学生|がくせい} → học sinh · {先生|せんせい} → giáo viên · {会社員|かいしゃいん} → nhân viên công ty",
  );
  const firstPair = correct.find(([left]) => left === 1);
  assert.ok(firstPair);
  assert.equal(describeRawAnswer(question, [firstPair]), "{学生|がくせい} → học sinh");
});

test("a question written row by row still reaches learners in a shuffled menu", () => {
  const question = parseAssignableQuestion({
    id: "q-typed",
    type: "match",
    prompt: "Nối.",
    left: ["いぬ", "ねこ", "とり"],
    right: ["chó", "mèo", "chim"],
    answer: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    explain: "いぬ là chó.",
    points: 1,
    tags: [],
  });
  const view = toQuestionView(question);
  assert.equal(view.type, "match");
  if (view.type === "match") {
    assert.ok(view.right.some((option, row) => option.index !== row));
  }
});

test("the lesson editor keeps typed columns and publishes the pairs shuffled", () => {
  const typed = fromMatchColumns(["いぬ", "ねこ", ""], ["chó", "mèo"]);
  assert.deepEqual(toMatchColumns(typed), { left: ["いぬ", "ねこ", ""], right: ["chó", "mèo"] });

  const draftQuestion: DraftMatchQuestion = {
    id: "q-new-match",
    type: "match",
    prompt: "Ghép từ với nghĩa.",
    explain: "いぬ là chó.",
    points: 1,
    tags: [],
    ...fromMatchColumns(["いぬ", "ねこ", "とり"], ["chó", "mèo"]),
  };
  const editorDraft = toQuestionDraft(draftQuestion, 1);
  assert.equal(editorDraft.type, "match");
  if (editorDraft.type === "match") {
    assert.equal(editorDraft.rightText, "chó\nmèo");
    const typedMore = fromQuestionDraft({ ...editorDraft, rightText: "chó\nmèo\n" }, draftQuestion);
    assert.equal(toQuestionDraft(typedMore as DraftMatchQuestion, 1).type, "match");
  }

  const state = parseLessonDraftState({
    metadata: {
      title: rawDraft.title,
      titleJa: rawDraft.titleJa,
      summary: rawDraft.summary,
      order: rawDraft.order,
      courseId: rawDraft.courseId,
    },
    content: { ...rawDraft.content, questions: [...rawDraft.content.questions, draftQuestion] },
  });
  const problems = findPublishProblems(state).filter((item) => item.itemId === "q-new-match");
  assert.equal(problems.length, 1);
  assert.match(problems[0]?.message ?? "", /mỗi dòng bên trái cần đúng một dòng bên phải/);

  const fixed = state.content.questions.map((item) =>
    item.id === "q-new-match"
      ? {
          ...draftQuestion,
          ...fromMatchColumns(["いぬ", "ねこ", "とり", ""], ["chó", "mèo", "chim", ""]),
        }
      : item,
  );
  const ready = { ...state, content: { ...state.content, questions: fixed } };
  assert.deepEqual(
    findPublishProblems(ready).filter((item) => item.itemId === "q-new-match"),
    [],
  );
  const published = toPublishableContent(ready.content).questions.find(
    (item) => item.id === "q-new-match",
  );
  assert.equal(published?.type, "match");
  if (published?.type === "match") {
    assert.equal(published.left.length, 3, "blank rows are dropped");
    assert.deepEqual(toMatchColumns(published), {
      left: ["いぬ", "ねこ", "とり"],
      right: ["chó", "mèo", "chim"],
    });
  }
});

test("teachers write matching test questions as two columns", () => {
  const draft = {
    key: 1,
    type: "match" as const,
    passage: "",
    prompt: "Ghép từ với nghĩa.",
    explain: "いぬ là chó.",
    points: 2,
    leftText: "いぬ\nねこ",
    rightText: "chó\nmèo",
  };
  assert.equal(describeQuestionProblem(draft), null);
  const [question] = toTestQuestions([toTestQuestionInput(draft)]);
  assert.equal(question?.type, "match");
  if (question?.type === "match") {
    assert.deepEqual(toMatchColumns(question), { left: ["いぬ", "ねこ"], right: ["chó", "mèo"] });
  }
  assert.match(
    describeQuestionProblem({ ...draft, rightText: "chó" }) ?? "",
    /Mỗi dòng bên trái cần đúng một dòng bên phải/,
  );
  assert.match(
    describeQuestionProblem({ ...draft, leftText: "いぬ", rightText: "chó" }) ?? "",
    /Cần ít nhất 2 cặp/,
  );
  assert.match(
    describeMatchProblem(["いぬ", "いぬ"], ["chó", "mèo"]) ?? "",
    /mỗi vế trong một cột phải khác nhau/,
  );
});
