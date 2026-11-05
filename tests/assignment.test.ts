import assert from "node:assert/strict";
import { test } from "node:test";

import {
  answerLang,
  assignmentSettingsSchema,
  classQuestionLang,
  compareDueUrgency,
  countBlankAnswers,
  describeCorrectAnswer,
  describeTimeLeft,
  getDeadlineState,
  isAssignableQuestion,
  isFeedbackAvailable,
  isHandedInAtDeadline,
  describeRawAnswer,
  isSameAttemptDraft,
  joinOrderTokens,
  parseAssignableQuestion,
  parseAttemptDraft,
  parseSnapshotQuestion,
  toAttemptItems,
  toQuestionView,
  toStoredRawAnswer,
  toTestQuestions,
} from "../lib/assignment";
import { gradeQuestion } from "../lib/grading/grade";

const questions = toTestQuestions([
  {
    type: "choice",
    prompt: "わたし___ がくせいです。",
    options: ["は", "を"],
    answer: [0],
    multiple: false,
    explain: "は đánh dấu chủ đề.",
    points: 1,
  },
  {
    type: "fill",
    prompt: "Viết “tôi” bằng kanji",
    answer: ["私"],
    inputMode: "japanese",
    kanjiStrict: true,
    explain: "私 đọc là わたし.",
    points: 2,
  },
]);

test("an attempt stamped with the deadline itself was handed in by the morning job", () => {
  const due = "2026-11-04T16:59:59+00:00";
  // Postgres may write the same instant with another offset or precision.
  assert.equal(isHandedInAtDeadline("2026-11-04T23:59:59.000+07:00", due), true);
  assert.equal(isHandedInAtDeadline("2026-11-04T16:58:12.345+00:00", due), false);
  assert.equal(isHandedInAtDeadline("2026-11-04T16:59:59+00:00", null), false);
  assert.equal(isHandedInAtDeadline(null, due), false);
});

test("test payloads expose only the question allowlist before feedback", () => {
  const testItems = toAttemptItems(questions, "test");
  const serialized = JSON.stringify(testItems);
  for (const field of ['"answer"', '"explain"', '"tags"', "kanjiStrict", "đánh dấu chủ đề"]) {
    assert.equal(serialized.includes(field), false, `${field} leaked into a test payload`);
  }
  assert.deepEqual(
    testItems.map((item) => item.view.id),
    ["t1", "t2"],
  );
  const practiceItems = toAttemptItems(questions, "practice");
  assert.equal(practiceItems[0].answerKey?.explain, "は đánh dấu chủ đề.");
  assert.equal(describeCorrectAnswer(questions[0]), "は");
});

test("a kana answer accepted before a question became kanji-strict is left out, not fatal", () => {
  const snapshot = {
    id: "k1",
    type: "fill",
    prompt: "Viết bằng kanji: がっこう",
    inputMode: "japanese",
    kanjiStrict: true,
    answer: ["学校", "がっこう"],
    explain: "学校.",
    points: 1,
  };
  const question = parseSnapshotQuestion(snapshot);
  assert.ok(question.type === "fill");
  assert.deepEqual(question.answer, ["学校"]);
  assert.equal(gradeQuestion(question, "がっこう").isCorrect, false);
  // A question whose answers are all kana is still an authoring error.
  assert.throws(() => parseSnapshotQuestion({ ...snapshot, answer: ["がっこう"] }));
});

test("multiple-choice answers read as all options, typed alternatives as any one", () => {
  const multiple = parseAssignableQuestion({
    id: "c1",
    type: "choice",
    prompt: "Từ nào đếm bằng 〜つ?",
    options: ["りんご", "がくせい", "いす"],
    multiple: true,
    answer: [0, 2],
    explain: "Đồ vật.",
    points: 1,
  });
  assert.equal(describeCorrectAnswer(multiple), "りんご + いす");
  assert.equal(describeRawAnswer(multiple, [0, 1]), "りんご + がくせい");
});

test("a Vietnamese text answer in a Chinese class keeps the class language", () => {
  const [text] = toTestQuestions(
    [
      {
        type: "fill",
        prompt: "Dịch: 我是学生",
        inputMode: "text",
        kanjiStrict: false,
        answer: ["tôi là học sinh"],
        explain: "我是学生: tôi là học sinh.",
        points: 1,
      },
    ],
    "zh-Hans",
  );
  assert.equal(toQuestionView(text).lang, "vi");
});

test("accepted spellings that grade the same are shown once, others all", () => {
  const [dictation, meaning] = [
    {
      id: "d1",
      type: "dictation",
      prompt: "Nghe và chép lại câu.",
      audio: "e685a87a352360eca77cdc6f1e9625c6",
      transcript: "わたしはがくせいです。",
      answer: ["わたしはがくせいです。", "わたしはがくせいです", "わたし は がくせいです"],
      explain: "Câu giới thiệu.",
      points: 1,
    },
    {
      id: "m1",
      type: "fill",
      prompt: "Nghĩa của せんせい",
      inputMode: "text",
      answer: ["giáo viên", "Giáo viên.", "thầy giáo"],
      explain: "Giáo viên.",
      points: 1,
    },
  ].map(parseAssignableQuestion);
  assert.equal(describeCorrectAnswer(dictation), "わたしはがくせいです。");
  assert.equal(describeCorrectAnswer(meaning), "giáo viên / thầy giáo");
});

test("assignment questions are limited to supported types with valid kanji-strict answers", () => {
  assert.throws(() =>
    toTestQuestions([
      {
        type: "fill",
        prompt: "Kanji",
        answer: ["わたし"],
        inputMode: "japanese",
        kanjiStrict: true,
        explain: "Phải có kanji.",
        points: 1,
      },
    ]),
  );
  // Matching is gradable but has no learner screen yet.
  assert.throws(() =>
    parseAssignableQuestion({
      id: "m1",
      type: "match",
      prompt: "Nối",
      left: ["いぬ"],
      right: ["chó"],
      answer: [[0, 0]],
      explain: "Chưa có UI.",
      points: 1,
    }),
  );
});

test("settings enforce practice feedback, one test attempt and after-due deadlines", () => {
  const base = {
    title: "Bài 1",
    mode: "practice",
    dueAt: null,
    allowLate: false,
    passScore: 70,
    maxAttempts: 3,
    feedbackPolicy: "after_submit",
  };
  assert.equal(assignmentSettingsSchema.safeParse(base).success, true);
  assert.equal(
    assignmentSettingsSchema.safeParse({ ...base, feedbackPolicy: "after_due" }).success,
    false,
  );
  assert.equal(assignmentSettingsSchema.safeParse({ ...base, mode: "test" }).success, false);
  assert.equal(
    assignmentSettingsSchema.safeParse({
      ...base,
      mode: "test",
      maxAttempts: 1,
      feedbackPolicy: "after_due",
    }).success,
    false,
  );
});

test("feedback and deadline states follow server time", () => {
  const dueAt = "2026-11-01T10:00:00.000Z";
  const rule = { feedbackPolicy: "after_due" as const, dueAt };
  assert.equal(isFeedbackAvailable(rule, null, new Date("2026-11-02T00:00:00Z")), false);
  assert.equal(isFeedbackAvailable(rule, dueAt, new Date("2026-11-01T09:59:59Z")), false);
  assert.equal(isFeedbackAvailable(rule, dueAt, new Date(dueAt)), true);
  assert.equal(
    isFeedbackAvailable({ feedbackPolicy: "after_submit", dueAt: null }, dueAt, new Date(0)),
    true,
  );
  assert.equal(getDeadlineState(dueAt, false, new Date(dueAt)), "on_time");
  assert.equal(getDeadlineState(dueAt, false, new Date("2026-11-01T10:00:01Z")), "past_due");
  assert.equal(getDeadlineState(dueAt, true, new Date("2026-11-01T10:00:01Z")), "late");
  assert.equal(getDeadlineState(null, false, new Date()), "no_deadline");
});

test("drafts reject unknown questions, invalid raw values and oversized payloads", () => {
  const views = questions.map(toQuestionView);
  const draft = parseAttemptDraft(views, { answers: { t1: [0], t2: "  " }, checked: ["t1"] });
  assert.deepEqual(draft, { answers: { t1: [0] }, checked: ["t1"], listens: {} });
  assert.equal(countBlankAnswers(views, draft), 1);
  assert.throws(() => parseAttemptDraft(views, { answers: { other: "x" } }));
  assert.throws(() => parseAttemptDraft(views, { answers: { t1: [5] } }));
  assert.throws(() => parseAttemptDraft(views, { answers: {}, checked: ["missing"] }));
  assert.throws(() => parseAttemptDraft(views, { answers: { t2: "あ".repeat(201) } }));
  assert.throws(() => parseAttemptDraft(views, { answers: {}, extra: true }));
});

test("a draft read back from the database matches the draft that was sent", () => {
  const views = questions.map(toQuestionView);
  const sent = { answers: { t1: [0], t2: "がくせい" }, checked: ["t1"] };
  // The database does not keep key order and the server drops blank answers.
  const stored = { listens: {}, checked: ["t1"], answers: { t2: "がくせい", t1: [0] } };
  assert.equal(isSameAttemptDraft(views, sent, stored), true);
  assert.equal(
    isSameAttemptDraft(views, { ...sent, answers: { ...sent.answers, t3: "" } }, stored),
    false,
  );
  assert.equal(
    isSameAttemptDraft(
      views,
      { answers: { t1: [0], t2: "  " }, checked: [] },
      {
        answers: { t1: [0] },
        checked: [],
      },
    ),
    true,
  );
  assert.equal(isSameAttemptDraft(views, sent, { answers: { t1: [1] }, checked: ["t1"] }), false);
  assert.equal(isSameAttemptDraft(views, sent, undefined), false);
});

test("open work lists today's deadlines before missed ones, newest missed first", () => {
  const now = new Date("2026-10-30T03:00:00Z");
  const dueDates = [
    "2026-10-16T16:59:59Z",
    null,
    "2026-10-30T16:59:59Z",
    "2026-10-29T16:59:59Z",
    "2026-11-02T10:00:00Z",
  ];
  assert.deepEqual(
    [...dueDates].sort((first, second) => compareDueUrgency(first, second, now)),
    [
      "2026-10-30T16:59:59Z",
      "2026-11-02T10:00:00Z",
      null,
      "2026-10-29T16:59:59Z",
      "2026-10-16T16:59:59Z",
    ],
  );
});

const listeningQuestions = [
  parseAssignableQuestion({
    id: "l1",
    type: "listen",
    prompt: "Người nói đi đâu?",
    responseType: "choice",
    audio: "a".repeat(32),
    transcript: "がっこうへいきます。",
    maxListens: 2,
    options: ["がっこう", "えき"],
    answer: [0],
    explain: "がっこう là trường học.",
    points: 1,
  }),
  parseAssignableQuestion({
    id: "d1",
    type: "dictation",
    prompt: "Nghe và viết lại",
    audio: "b".repeat(32),
    transcript: "わたしはがくせいです。",
    inputMode: "hiragana",
    answer: ["わたしはがくせいです"],
    explain: "Câu giới thiệu.",
    points: 2,
  }),
];

test("listening views hide transcripts and answers but keep audio and listen limits", () => {
  const views = listeningQuestions.map(toQuestionView);
  const serialized = JSON.stringify(views);
  for (const field of ["transcript", "がっこうへいきます", '"answer"', '"explain"']) {
    assert.equal(serialized.includes(field), false, `${field} leaked into a listening view`);
  }
  assert.deepEqual(views[0], {
    id: "l1",
    type: "listen",
    prompt: "Người nói đi đâu?",
    points: 1,
    lang: "ja",
    audio: "a".repeat(32),
    maxListens: 2,
    responseType: "choice",
    options: ["がっこう", "えき"],
  });
  assert.equal(views[1].type === "dictation" && views[1].inputMode, "hiragana");
  assert.equal(listeningQuestions.every(isAssignableQuestion), true);
  assert.equal(describeCorrectAnswer(listeningQuestions[0]), "がっこう");
});

test("drafts record listens only for listening questions within the recorded range", () => {
  const views = [...questions, ...listeningQuestions].map(toQuestionView);
  const draft = parseAttemptDraft(views, {
    answers: { l1: [1], d1: "わたし" },
    checked: [],
    listens: { l1: 2, d1: 0 },
  });
  assert.deepEqual(draft.listens, { l1: 2, d1: 0 });
  assert.deepEqual(draft.answers, { l1: [1], d1: "わたし" });
  assert.throws(() => parseAttemptDraft(views, { answers: { l1: [0, 1] } }), "single choice");
  assert.throws(() => parseAttemptDraft(views, { answers: {}, listens: { t1: 1 } }));
  assert.throws(() => parseAttemptDraft(views, { answers: {}, listens: { l1: 101 } }));
  assert.throws(() => parseAttemptDraft(views, { answers: {}, listens: { l1: 1.5 } }));
  assert.deepEqual(parseAttemptDraft(views, { answers: {} }).listens, {});
});

test("shown answers keep the language they were typed in, not always Japanese", () => {
  const chinese = toTestQuestions(
    [
      {
        type: "fill",
        prompt: "Viết chữ Hán của “cảm ơn”",
        answer: ["谢谢"],
        inputMode: "chinese",
        kanjiStrict: false,
        explain: "谢谢 xièxie.",
        points: 1,
      },
      {
        type: "fill",
        prompt: "Viết pinyin của 老师",
        answer: ["lǎoshī"],
        inputMode: "pinyin",
        kanjiStrict: false,
        explain: "Thanh 3 rồi thanh 1.",
        points: 1,
      },
      {
        type: "choice",
        prompt: "你好 nghĩa là gì?",
        options: ["xin chào", "tạm biệt"],
        answer: [0],
        multiple: false,
        explain: "你好 là lời chào.",
        points: 1,
      },
    ],
    "zh-Hans",
  ).map(toQuestionView);
  assert.deepEqual(
    chinese.map((view) => [view.lang, answerLang(view)]),
    [
      ["vi", "zh"],
      ["vi", "zh-Latn-pinyin"],
      ["vi", "vi"],
    ],
  );
  const japanese = [...questions, ...listeningQuestions].map(toQuestionView);
  assert.deepEqual(japanese.map(answerLang), ["ja", "ja", "ja", "ja"]);
  const meaning = parseAssignableQuestion({
    id: "v1",
    type: "fill",
    prompt: "Nghĩa của でんわ",
    answer: ["điện thoại"],
    inputMode: "text",
    kanjiStrict: false,
    explain: "でんわ là điện thoại.",
    points: 1,
  });
  assert.equal(answerLang(toQuestionView(meaning)), "vi");
  assert.equal(classQuestionLang("ja-JP"), "ja");
  assert.equal(classQuestionLang("zh-Hant"), "vi");
});

const orderQuestion = parseAssignableQuestion({
  id: "o1",
  type: "order",
  prompt: "Sắp xếp thành câu: Tôi đã từng đi Nhật.",
  tokens: [
    { id: "a", text: "日本へ" },
    { id: "b", text: "行った" },
    { id: "c", text: "ことが" },
    { id: "d", text: "あります" },
  ],
  answer: ["a", "b", "c", "d"],
  tags: ["n4", "sentence-order"],
  explain: "〜たことがあります: đã từng.",
  points: 1,
});

test("sentence-order questions are assignable, shuffled for learners and graded by order", () => {
  const [view] = toAttemptItems([orderQuestion], "test").map((item) => item.view);
  assert.equal(view.type, "order");
  assert.equal(view.section, "Sắp xếp câu");
  if (view.type !== "order") {
    return;
  }
  // The pieces never arrive in the answer order, and nothing else about the answer leaks.
  assert.notDeepEqual(
    view.tokens.map((token) => token.id),
    ["a", "b", "c", "d"],
  );
  assert.deepEqual(view.tokens.map((token) => token.id).sort(), ["a", "b", "c", "d"]);
  assert.equal(JSON.stringify(view).includes("answer"), false);
  const draft = parseAttemptDraft([view], { answers: { o1: ["a", "b", "c", "d"] } });
  assert.deepEqual(draft.answers.o1, ["a", "b", "c", "d"]);
  assert.equal(gradeQuestion(orderQuestion, ["a", "b", "c", "d"]).isCorrect, true);
  assert.equal(gradeQuestion(orderQuestion, ["b", "a", "c", "d"]).isCorrect, false);
  assert.equal(gradeQuestion(orderQuestion, ["a", "b", "c"]).isCorrect, false);
  assert.throws(() => parseAttemptDraft([view], { answers: { o1: ["a", "a"] } }));
  assert.throws(() => parseAttemptDraft([view], { answers: { o1: ["z"] } }));
  assert.equal(describeCorrectAnswer(orderQuestion), "日本へ行ったことがあります");
  assert.equal(describeRawAnswer(orderQuestion, toStoredRawAnswer(["b", "a"])), "行った日本へ");
  assert.equal(countBlankAnswers([view], { answers: {}, checked: [], listens: {} }), 1);
});

test("an order question must use every piece once, and passages reach the learner view", () => {
  assert.throws(() =>
    parseAssignableQuestion({
      id: "o2",
      type: "order",
      prompt: "Sắp xếp",
      tokens: [
        { id: "a", text: "日本へ" },
        { id: "b", text: "行きます" },
      ],
      answer: ["a"],
      explain: "Thiếu mảnh.",
      points: 1,
    }),
  );
  const reading = parseAssignableQuestion({
    id: "r1",
    type: "choice",
    passage: "山田さんは毎週土曜日に料理の学校に通っています。",
    prompt: "いつ料理の学校に通っていますか。",
    options: ["毎週土曜日", "毎週日曜日"],
    answer: [0],
    tags: ["n4", "reading"],
    explain: "毎週土曜日に通っています。",
    points: 1,
  });
  const view = toQuestionView(reading);
  assert.equal(view.passage, "山田さんは毎週土曜日に料理の学校に通っています。");
  assert.equal(view.section, "Đọc hiểu");
  assert.equal(joinOrderTokens(["Tôi", "đi", "học"]), "Tôi đi học");
});

test("the countdown shows in the last hour and submits a minute early when late work is refused", () => {
  const due = "2026-11-04T16:59:00.000Z";
  const at = (iso: string) => Date.parse(iso);
  assert.equal(describeTimeLeft(null, false, at("2026-11-04T16:30:00Z")), null);
  assert.equal(describeTimeLeft(due, false, at("2026-11-04T15:58:00Z")), null);
  assert.deepEqual(describeTimeLeft(due, false, at("2026-11-04T16:30:00Z")), {
    text: "Còn 29:00 tới hạn. Bài tự nộp khi còn 1 phút.",
    isUrgent: false,
    shouldAutoSubmit: false,
  });
  const urgent = describeTimeLeft(due, false, at("2026-11-04T16:55:30Z"));
  assert.equal(urgent?.isUrgent, true);
  assert.equal(urgent?.shouldAutoSubmit, false);
  assert.equal(describeTimeLeft(due, false, at("2026-11-04T16:58:01Z"))?.shouldAutoSubmit, true);
  const late = describeTimeLeft(due, true, at("2026-11-04T16:58:30Z"));
  assert.equal(late?.shouldAutoSubmit, false);
  assert.equal(late?.text, "Còn 0:30 tới hạn; nộp sau đó sẽ ghi là nộp muộn.");
  assert.equal(describeTimeLeft(due, false, at("2026-11-04T17:00:00Z")), null);
});
