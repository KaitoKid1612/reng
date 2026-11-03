import assert from "node:assert/strict";
import { test } from "node:test";

import rawN4Bank from "../content/review-banks/n4-comprehensive.json";
import {
  answerLang,
  describeCorrectAnswer,
  parseAssignableQuestion,
  toQuestionView,
} from "../lib/assignment";
import { selectBalancedDailyQuestions } from "../lib/daily-practice";
import { gradeQuestion } from "../lib/grading/grade";
import { lessonContentSchema, lessonDraftSchema } from "../lib/lesson-schema";
import { findBankLanguageProblems } from "../lib/review-bank";

// A small Chinese bank in the same JSON shape as the Japanese one: the formats work for both.
const chineseBank = lessonContentSchema.parse({
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  slides: [{ id: "zh-title", type: "title", jp: "汉语复习", vi: "Ôn tiếng Trung" }],
  questions: [
    {
      id: "zh-order-01",
      type: "order",
      prompt: "Sắp xếp thành câu đúng. Nghĩa: “Tôi là học sinh.”",
      tokens: [
        { id: "p41", text: "学生" },
        { id: "p12", text: "我" },
        { id: "p77", text: "是" },
      ],
      answer: ["p12", "p77", "p41"],
      points: 1,
      tags: ["hsk1", "sentence-order"],
      explain: "Chủ ngữ + 是 + danh từ.",
      gradingProfile: "zh-exact-v1",
    },
    {
      id: "zh-pinyin-01",
      type: "fill",
      prompt: "Viết pinyin có dấu thanh của 老师.",
      answer: ["lǎoshī"],
      points: 1,
      tags: ["hsk1", "pinyin"],
      explain: "老师 lǎoshī: thầy/cô giáo.",
      inputMode: "pinyin",
      kanjiStrict: false,
      gradingProfile: "zh-exact-v1",
    },
    ...[1, 2].map((number) => ({
      id: `zh-reading-0${number}`,
      type: "choice",
      passage: "小明是学生。他每天早上七点去学校。",
      prompt: number === 1 ? "小明是做什么的？" : "小明几点去学校？",
      options: number === 1 ? ["老师", "学生", "医生"] : ["六点", "七点", "八点"],
      answer: [1],
      points: 1,
      tags: ["hsk1", "reading"],
      explain: "Thông tin có trong đoạn văn.",
      gradingProfile: "zh-exact-v1",
    })),
  ],
});

test("a Chinese bank uses the same formats with Chinese grading and display", () => {
  assert.deepEqual(findBankLanguageProblems(chineseBank, "zh-Hans"), []);
  const [order, pinyin, reading] = chineseBank.questions.map(parseAssignableQuestion);
  assert.equal(describeCorrectAnswer(order), "我是学生");
  assert.equal(gradeQuestion(order, ["p12", "p77", "p41"]).isCorrect, true);
  assert.equal(gradeQuestion(pinyin, "lǎoshī").isCorrect, true);
  // Chinese keeps tones: a missing tone mark is wrong, unlike the Japanese default profile.
  assert.equal(gradeQuestion(pinyin, "laoshi").isCorrect, false);
  const pinyinView = toQuestionView(pinyin);
  assert.equal(pinyinView.lang, "vi");
  assert.equal(answerLang(pinyinView), "zh-Latn-pinyin");
  assert.equal(pinyinView.section, "Pinyin");
  const readingView = toQuestionView(reading);
  assert.equal(readingView.passage, "小明是学生。他每天早上七点去学校。");
  assert.equal(readingView.section, "Đọc hiểu");
  const daily = selectBalancedDailyQuestions(
    chineseBank.questions.map((question) => ({
      id: question.id,
      type: question.type,
      tags: question.tags,
      group: question.passage,
    })),
    [],
    4,
    "zh-class:2026-11-03",
  );
  assert.deepEqual(daily.slice(-2), ["zh-reading-01", "zh-reading-02"]);
});

test("a bank must match the language it is imported for", () => {
  const japaneseBank = lessonDraftSchema.parse(rawN4Bank).content;
  assert.deepEqual(findBankLanguageProblems(japaneseBank, "ja-JP"), []);
  // The Japanese bank imported as Chinese: no Chinese profile, and JP-shaped vocab.
  const asChinese = findBankLanguageProblems(japaneseBank, "zh-Hans");
  assert.ok(asChinese.some((problem) => problem.includes("zh-exact-v1")));
  assert.ok(asChinese.some((problem) => problem.includes("vocab empty")));
  // Chinese questions do not belong in a Japanese bank.
  assert.equal(findBankLanguageProblems(chineseBank, "ja-JP").length, chineseBank.questions.length);
});
