import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assignmentSettingsSchema,
  compareDueUrgency,
  countBlankAnswers,
  describeCorrectAnswer,
  getDeadlineState,
  isAssignableQuestion,
  isFeedbackAvailable,
  isSameAttemptDraft,
  parseAssignableQuestion,
  parseAttemptDraft,
  toAttemptItems,
  toQuestionView,
  toTestQuestions,
} from "../lib/assignment";

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
  assert.throws(() =>
    parseAssignableQuestion({
      id: "o1",
      type: "order",
      prompt: "Sắp xếp",
      tokens: [{ id: "a", text: "は" }],
      answer: ["a"],
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
