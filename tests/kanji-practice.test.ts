import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  buildKanjiQuestions,
  createKanjiSession,
  extractKanjiWords,
  findWordsWithoutKanjiQuestions,
  getKanjiMistakes,
  initialKanjiPractice,
  isCorrectKanjiAnswer,
  isCorrectReading,
  kanjiPracticeReducer,
} from "../lib/kanji-practice";
import { draftContentSchema } from "../lib/lesson-draft";

import type { DraftContent } from "../lib/lesson-draft";

// Seeded stand-in for Math.random (mulberry32) so sessions and generated IDs repeat.
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const starter = JSON.parse(readFileSync("content/starters/minna-1-11.json", "utf8")) as {
  content: DraftContent;
};

test("only vocabulary written with kanji becomes practice material", () => {
  const words = extractKanjiWords([
    { id: "v1", jp: "わたし", kanji: "私", vi: "tôi" },
    { id: "v2", jp: "こんにちは", kanji: "こんにちは", vi: "xin chào" },
    { id: "v3", jp: "ノート", vi: "vở" },
    { id: "v4", jp: "〜にん", kanji: "〜人", vi: "… người" },
  ]);
  assert.deepEqual(
    words.map((word) => word.id),
    ["v1", "v4"],
  );
  assert.equal(extractKanjiWords(starter.content.vocab).length, 37);
});

test("readings ignore spaces, the 〜 mark, katakana and a final full stop only", () => {
  const counter = { id: "v", written: "〜人", reading: "〜にん", meaning: "… người" };
  assert.equal(isCorrectReading(counter, "にん"), true);
  assert.equal(isCorrectReading(counter, "ニン"), true);
  assert.equal(isCorrectReading(counter, "じん"), false);
  const phrase = { id: "p", written: "いい天気ですね", reading: "いい てんきですね", meaning: "" };
  assert.equal(isCorrectReading(phrase, "いいてんきですね。"), true);
  assert.equal(isCorrectReading(phrase, "いいてんき"), false);
  assert.equal(isCorrectReading(phrase, "  "), false);
});

test("sessions use each word once, rotate kinds and offer the right option", () => {
  const words = extractKanjiWords(starter.content.vocab);
  const questions = createKanjiSession(words, ["reading", "written", "meaning"], 9, seeded(1));
  assert.equal(questions.length, 9);
  assert.equal(new Set(questions.map((question) => question.word.id)).size, 9);
  assert.deepEqual(
    questions.slice(0, 3).map((question) => question.kind),
    ["reading", "written", "meaning"],
  );
  for (const question of questions.filter((item) => item.kind !== "reading")) {
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    const expected = question.kind === "written" ? question.word.written : question.word.meaning;
    assert.equal(question.options[question.answerIndex], expected);
    assert.equal(isCorrectKanjiAnswer(question, String(question.answerIndex)), true);
  }
  const single = createKanjiSession(words.slice(0, 1), ["written"], 5);
  assert.equal(single[0].kind, "reading", "nothing to choose between falls back to reading");
});

test("the practice reducer grades answers and lists the mistakes", () => {
  const words = extractKanjiWords([
    { id: "v1", jp: "わたし", kanji: "私", vi: "tôi" },
    { id: "v2", jp: "なまえ", kanji: "名前", vi: "tên" },
  ]);
  const questions = createKanjiSession(words, ["reading"], 2, seeded(2));
  let state = kanjiPracticeReducer(initialKanjiPractice, { type: "start", questions });
  state = kanjiPracticeReducer(state, { type: "submit", answer: questions[0].word.reading });
  assert.equal(state.records[0].correct, true);
  state = kanjiPracticeReducer(state, { type: "next" });
  assert.equal(kanjiPracticeReducer(state, { type: "submit", answer: " " }), state);
  state = kanjiPracticeReducer(state, { type: "submit", answer: "ちがう" });
  state = kanjiPracticeReducer(state, { type: "next" });
  assert.equal(state.phase, "result");
  assert.deepEqual(
    getKanjiMistakes(state).map((mistake) => mistake.question.word.id),
    [questions[1].word.id],
  );
});

test("generated question-bank items are valid drafts and are not generated twice", () => {
  const content = draftContentSchema.parse(starter.content);
  const created = buildKanjiQuestions(content, seeded(3));
  assert.equal(created.length, 74, "a reading and a pick-the-kanji question per word");
  const next = draftContentSchema.parse({
    ...content,
    questions: [...content.questions, ...created],
  });
  assert.equal(new Set(next.questions.map((question) => question.id)).size, next.questions.length);
  const reading = created.find(
    (question) => question.type === "fill" && question.prompt.endsWith("〜人"),
  );
  assert.ok(reading && reading.type === "fill");
  assert.deepEqual(reading.answer, ["にん"]);
  for (const question of created) {
    assert.ok(question.tags.includes("kanji"));
    if (question.type === "choice") {
      assert.equal(question.options.length, 4);
      assert.equal(question.answer.length, 1);
    }
  }
  assert.equal(findWordsWithoutKanjiQuestions(next).length, 0);
  assert.equal(buildKanjiQuestions(next).length, 0);
});
