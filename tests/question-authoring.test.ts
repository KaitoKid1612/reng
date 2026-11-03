import assert from "node:assert/strict";
import { test } from "node:test";

import rawDraft from "../content/lessons/lesson-01.json";
import { toTestQuestions } from "../lib/assignment";
import {
  createQuestion,
  fromQuestionDraft,
  isTextQuestion,
  toQuestionDraft,
} from "../lib/editor-questions";
import {
  findPublishProblems,
  parseLessonDraftState,
  toPublishableContent,
} from "../lib/lesson-draft";
import { createEditorState, editorReducer } from "../lib/lesson-editor";
import { toOrderTokens } from "../lib/order-pieces";
import {
  createTeachingDraft,
  reviewTeachingDraft,
  teachingDraftSchema,
  toPublicQuestion,
} from "../lib/teaching-content";
import {
  createBlankQuestion,
  createReviewedQuestions,
  isQuestionReviewed,
  teachingReducer,
} from "../lib/teaching-draft";
import { parseVocabularyTable } from "../lib/teaching-table";
import { currentSlidePlan, generateTeachingSlides } from "../lib/teaching-templates";
import {
  createQuestionDraft,
  describeQuestionProblem,
  toTestQuestionInput,
} from "../lib/test-question-draft";

import type { LessonQuestion } from "../lib/lesson-schema";

const PASSAGE = "たなかさんは まいあさ パンを たべます。";
const READING = {
  id: "q-read-1",
  type: "choice",
  passage: PASSAGE,
  prompt: "たなかさんは あさ なにを たべますか。",
  options: ["パン", "ごはん"],
  answer: [0],
  multiple: false,
  points: 1,
  tags: ["reading"],
  explain: "Đoạn văn nói たなかさん ăn bánh mì.",
};
const CHINESE_FILL = {
  id: "q-zh-1",
  type: "fill",
  prompt: "Viết “xin chào” bằng chữ Hán.",
  answer: ["你好"],
  inputMode: "chinese",
  kanjiStrict: false,
  points: 1,
  tags: ["hanzi"],
  explain: "你好 nghĩa là xin chào.",
  gradingProfile: "zh-exact-v1",
};

function draftWith(questions: readonly object[]) {
  return parseLessonDraftState({
    metadata: {
      title: rawDraft.title,
      titleJa: rawDraft.titleJa,
      summary: rawDraft.summary,
      order: rawDraft.order,
      courseId: rawDraft.courseId,
    },
    content: { ...rawDraft.content, questions: [...rawDraft.content.questions, ...questions] },
  });
}

function questionProblems(state: ReturnType<typeof draftWith>, id: string) {
  return findPublishProblems(state)
    .filter((problem) => problem.itemId === id)
    .map((problem) => problem.message);
}

test("editing a bank question keeps its reading passage and its Chinese grading", () => {
  const state = draftWith([READING, CHINESE_FILL]);
  const [reading, chinese] = state.content.questions.slice(-2);
  assert.ok(isTextQuestion(reading) && isTextQuestion(chinese));
  const editedReading = fromQuestionDraft(
    { ...toQuestionDraft(reading, 1), prompt: "あさごはんは なんですか。" },
    reading,
  );
  assert.equal(editedReading.passage, PASSAGE);
  assert.deepEqual(editedReading.tags, ["reading"]);
  const chineseDraft = toQuestionDraft(chinese, 2);
  assert.ok(chineseDraft.type === "fill");
  const editedChinese = fromQuestionDraft({ ...chineseDraft, explain: "Lời giải mới" }, chinese);
  assert.equal(editedChinese.gradingProfile, "zh-exact-v1");

  // The input decides the rules of a typed answer, as for private test questions.
  const asHiragana = fromQuestionDraft({ ...chineseDraft, inputMode: "hiragana" }, chinese);
  assert.equal(asHiragana.gradingProfile, undefined);
  assert.ok(isTextQuestion(asHiragana));
  const hiraganaDraft = toQuestionDraft(asHiragana, 2);
  assert.ok(hiraganaDraft.type === "fill");
  assert.equal(
    fromQuestionDraft({ ...hiraganaDraft, inputMode: "pinyin" }, asHiragana).gradingProfile,
    "zh-exact-v1",
  );

  const published = toPublishableContent({
    ...state.content,
    questions: [...state.content.questions.slice(0, -2), editedReading, editedChinese],
  }).questions.slice(-2);
  assert.equal(published[0].passage, PASSAGE);
  assert.equal(published[1].gradingProfile, "zh-exact-v1");
});

test("the web editor writes sentence-order questions and drops blank pieces on publish", () => {
  let editor = createEditorState(draftWith([]));
  const blank = createQuestion("q-order-1", "order");
  editor = editorReducer(editor, { type: "addQuestion", question: blank });
  const added = editor.draft.content.questions.at(-1);
  assert.ok(added && isTextQuestion(added));
  const draft = toQuestionDraft(added, 1);
  assert.ok(draft.type === "order");
  assert.equal(draft.pieces, "");
  const typed = fromQuestionDraft(
    {
      ...draft,
      prompt: "Sắp xếp thành câu đúng.",
      explain: "わたしは がくせいです: tôi là học sinh.",
      pieces: "わたしは\nがくせい\nです\n",
    },
    added,
  );
  assert.ok(isTextQuestion(typed));
  // The blank line being typed stays in the box.
  const retyped = toQuestionDraft(typed, 1);
  assert.ok(retyped.type === "order");
  assert.equal(retyped.pieces, "わたしは\nがくせい\nです\n");
  editor = editorReducer(editor, { type: "updateQuestion", question: typed });
  assert.deepEqual(questionProblems(editor.draft, "q-order-1"), []);
  const published = toPublishableContent(editor.draft.content).questions.at(-1);
  assert.ok(published?.type === "order");
  assert.deepEqual(
    published.answer.map((id) => published.tokens.find((token) => token.id === id)?.text),
    ["わたしは", "がくせい", "です"],
  );

  const withPieces = (pieces: string) =>
    editorReducer(editor, {
      type: "updateQuestion",
      question: fromQuestionDraft({ ...retyped, pieces }, typed),
    }).draft;
  const label = `Câu luyện ${editor.draft.content.questions.length}`;
  assert.deepEqual(questionProblems(withPieces("です"), "q-order-1"), [
    `${label}: cần ít nhất 2 mảnh, mỗi dòng một mảnh.`,
  ]);
  assert.match(questionProblems(withPieces("です\nです"), "q-order-1")[0], /hai mảnh giống nhau/);
});

test("a question for the same passage keeps the passage and the language and comes next", () => {
  const state = draftWith([READING, CHINESE_FILL]);
  const chinese = state.content.questions.at(-1);
  assert.ok(chinese && isTextQuestion(chinese));
  const next = createQuestion("q-read-2", "choice", { ...chinese, passage: "小明是学生。" });
  assert.equal(next.passage, "小明是学生。");
  assert.equal(next.gradingProfile, "zh-exact-v1");

  const editor = editorReducer(createEditorState(state), {
    type: "addQuestion",
    question: createQuestion("q-read-3", "choice", { passage: PASSAGE }),
    afterId: "q-read-1",
  });
  const ids = editor.draft.content.questions.map((question) => question.id);
  assert.equal(ids[ids.indexOf("q-read-1") + 1], "q-read-3");

  let teaching = createTeachingDraft("Đọc hiểu", "starter", "zh-Hans", "Đọc đoạn văn ngắn");
  teaching = teachingReducer(teaching, {
    type: "addQuestion",
    question: createBlankQuestion(teaching.content, "choice", "小明是学生。"),
  });
  teaching = teachingReducer(teaching, {
    type: "addQuestion",
    question: createBlankQuestion(teaching.content, "fill"),
  });
  const first = teaching.content.questions[0];
  teaching = teachingReducer(teaching, {
    type: "addQuestion",
    question: createBlankQuestion(teaching.content, "order", first.passage),
    afterId: first.id,
  });
  assert.deepEqual(
    teaching.content.questions.map((question) => [question.type, question.passage]),
    [
      ["choice", "小明是学生。"],
      ["order", "小明是学生。"],
      ["fill", undefined],
    ],
  );
});

test("test questions take sentence order and passages, and the server checks the same limits", () => {
  const created = createQuestionDraft(1, "order", "zh-Hans", " 小明：你好！我是学生。 ");
  assert.ok(created.type === "order");
  const draft = {
    ...created,
    prompt: "Sắp xếp thành câu đúng.",
    explain: "我是学生: tôi là học sinh.",
    pieces: "我\n是\n\n学生\n",
  };
  assert.equal(describeQuestionProblem(draft), null);
  const input = toTestQuestionInput(draft);
  assert.ok(input.type === "order");
  assert.equal(input.passage, "小明：你好！我是学生。");
  assert.equal(input.prompt, "Sắp xếp thành câu đúng.");
  assert.deepEqual(
    input.answer.map((id) => input.tokens.find((token) => token.id === id)?.text),
    ["我", "是", "学生"],
  );
  // Piece IDs reach the learner's page, so they must not follow the sentence order.
  assert.ok(input.tokens.every((token) => /^p-[a-z2-9]{6}$/.test(token.id)));
  const [chinese] = toTestQuestions([input], "zh-Hans");
  assert.equal(chinese.gradingProfile, "zh-exact-v1");
  assert.equal(chinese.passage, "小明：你好！我是学生。");
  assert.equal(toTestQuestions([input], "ja-JP")[0].gradingProfile, undefined);

  assert.equal(
    describeQuestionProblem({ ...draft, pieces: "学生" }),
    "Cần ít nhất 2 mảnh, mỗi dòng một mảnh.",
  );
  assert.match(
    describeQuestionProblem({ ...draft, pieces: "我\n我" }) ?? "",
    /^Hai mảnh giống nhau/,
  );
  assert.equal(
    describeQuestionProblem({
      ...draft,
      pieces: Array.from({ length: 11 }, (_, i) => `${i}`).join("\n"),
    }),
    "Tối đa 10 mảnh.",
  );
  assert.equal(
    describeQuestionProblem({ ...draft, passage: "字".repeat(2001) }),
    "Đoạn văn tối đa 2000 ký tự.",
  );

  // The browser could send anything, so the server applies the authoring limits too.
  assert.throws(() =>
    toTestQuestions([
      {
        ...input,
        tokens: [
          { id: "p1", text: "我" },
          { id: "p2", text: "我" },
        ],
        answer: ["p1", "p2"],
      },
    ]),
  );
  assert.throws(() =>
    toTestQuestions([
      {
        type: "choice",
        prompt: "Chọn",
        options: ["1", "2", "3", "4", "5", "6", "7"],
        answer: [0],
        multiple: false,
        explain: "Giải thích",
        points: 1,
      },
    ]),
  );
});

test("the Chinese editor checks sentence order, drops a blank passage and notices an edited piece", () => {
  let draft = createTeachingDraft("Đọc hiểu", "starter", "zh-Hans", "Đọc đoạn văn ngắn");
  const blank = createBlankQuestion(draft.content, "order");
  assert.ok(blank.type === "order");
  const question = {
    ...blank,
    passage: "小明：你好！我是学生。",
    prompt: "Sắp xếp thành câu đúng.",
    explain: "我是学生: tôi là học sinh.",
    ...toOrderTokens(["我", "是", "学生"]),
  };
  draft = teachingReducer(draft, { type: "addQuestion", question });
  const problems = (value: typeof draft) =>
    reviewTeachingDraft(value).problems.filter((problem) => problem.startsWith("Câu luyện 1"));
  assert.deepEqual(problems(draft), []);
  const withTokens = (tokens: string[]) =>
    teachingReducer(draft, {
      type: "updateQuestion",
      question: { ...question, ...toOrderTokens(tokens) },
    });
  assert.match(problems(withTokens(["我", "我"]))[0], /hai mảnh giống nhau/);
  assert.deepEqual(problems(withTokens(["我", "", "学生"])), ["Câu luyện 1: xóa mảnh trống."]);

  // Published v2 content is the saved draft, so a passage of spaces disappears when saved.
  const saved = teachingDraftSchema.parse({
    ...draft,
    content: { ...draft.content, questions: [{ ...question, passage: "   " }] },
  });
  assert.equal(saved.content.questions[0].passage, undefined);

  const reviewed = createReviewedQuestions(draft, [question.id]);
  assert.ok(isQuestionReviewed(question, reviewed));
  const editedPiece = { ...question, ...toOrderTokens(["我", "是", "老师"]) };
  assert.ok(!isQuestionReviewed(editedPiece, reviewed));
});

test("slides show the pieces in a shuffle that is never the answer, with the passage", () => {
  const question: LessonQuestion = {
    id: "question-abc123",
    type: "order",
    passage: "小明：你好！我是学生。",
    prompt: "Sắp xếp thành câu đúng.",
    points: 1,
    tags: [],
    explain: "我是学生.",
    ...toOrderTokens(["我", "是", "学生"]),
  };
  const shown = toPublicQuestion(question);
  assert.equal(shown.passage, "小明：你好！我是学生。");
  assert.deepEqual([...(shown.pieces ?? [])].sort(), ["学生", "我", "是"].sort());
  assert.notDeepEqual(shown.pieces, ["我", "是", "学生"]);
  assert.equal(shown.options, undefined);
});

test("pasting words stops at the lesson limit instead of leaving a draft that cannot be saved", () => {
  let draft = createTeachingDraft("Từ vựng dài", "vocabulary", "zh-Hans", "Học nhiều từ");
  const filler = Array.from({ length: 98 }, (_, index) => `字${index}\tzì\tchữ ${index}`).join(
    "\n",
  );
  draft = teachingReducer(draft, {
    type: "addVocabRows",
    rows: parseVocabularyTable(filler, draft.content.vocab).rows,
  });
  assert.equal(draft.content.vocab.length, 98);
  const pasted = parseVocabularyTable("一\tyī\tmột\n二\tèr\thai\n三\tsān\tba", draft.content.vocab);
  assert.deepEqual(
    pasted.rows.map((row) => row.status),
    ["valid", "valid", "invalid"],
  );
  assert.match(pasted.rows[2].problems[0], /đã đủ 100 từ/);
  draft = teachingReducer(draft, { type: "addVocabRows", rows: pasted.rows });
  assert.equal(draft.content.vocab.length, 100);
  assert.ok(teachingDraftSchema.safeParse(draft).success);

  // A preview made before more words were added cannot overfill the lesson either.
  const stale = parseVocabularyTable("四\tsì\tbốn", draft.content.vocab.slice(0, 99));
  assert.equal(stale.rows[0].status, "valid");
  assert.equal(
    teachingReducer(draft, { type: "addVocabRows", rows: stale.rows }).content.vocab.length,
    100,
  );
  assert.equal(teachingReducer(draft, { type: "addVocab" }).content.vocab.length, 100);
});

test("a slide plan built before a later slide edit is not applied over that edit", () => {
  let draft = createTeachingDraft("Slide", "starter", "zh-Hans", "Chào hỏi");
  draft = teachingReducer(draft, {
    type: "applySlides",
    generation: generateTeachingSlides(draft),
  });
  draft = teachingReducer(draft, {
    type: "addQuestion",
    question: createBlankQuestion(draft.content, "choice"),
  });
  const plan = { generation: generateTeachingSlides(draft), content: draft.content };
  assert.ok(currentSlidePlan(plan, draft.content));
  const title = draft.content.slides[0];
  assert.ok(title.type === "title");
  const edits = [
    teachingReducer(draft, { type: "updateSlide", slide: { ...title, teacherNotes: "Mở đầu" } }),
    teachingReducer(draft, { type: "addNoteSlide" }),
    teachingReducer(draft, { type: "removeItem", collection: "slides", id: title.id }),
    teachingReducer(draft, { type: "moveItem", collection: "slides", id: title.id, offset: 1 }),
  ];
  for (const edited of edits) {
    assert.equal(currentSlidePlan(plan, edited.content), null);
  }
});
