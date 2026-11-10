import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  composeJlptExam,
  countJlptSections,
  describeJlptCountdown,
  estimateJlptScore,
  examHandInAt,
  findNextJlptSession,
  formatExamClock,
  isExamTimeUp,
  isHandedInAtTimeLimit,
  jlptSectionOf,
  planJlptExam,
} from "@/lib/jlpt";

import type { JlptExamCandidate, JlptSectionScore } from "@/lib/jlpt";

async function loadBank(file: string): Promise<JlptExamCandidate[]> {
  const bank = JSON.parse(await readFile(`content/review-banks/${file}`, "utf8")) as {
    content: {
      questions: { id: string; type: string; tags?: string[]; passage?: string }[];
    };
  };
  return bank.content.questions.map((question) => ({
    id: question.id,
    type: question.type,
    tags: question.tags ?? [],
    passage: question.passage ?? null,
  }));
}

test("bank questions fall into the JLPT sections by type and tags", () => {
  assert.equal(jlptSectionOf({ type: "listen", tags: [] }), "listening");
  assert.equal(jlptSectionOf({ type: "dictation", tags: ["listening"] }), null, "no dictation");
  assert.equal(jlptSectionOf({ type: "choice", tags: ["文字・語彙"] }), "vocabulary");
  assert.equal(jlptSectionOf({ type: "fill", tags: ["n4", "Kanji"] }), "vocabulary");
  assert.equal(jlptSectionOf({ type: "choice", tags: ["paraphrase"] }), "vocabulary");
  assert.equal(jlptSectionOf({ type: "choice", tags: ["文法"] }), "grammarReading");
  assert.equal(jlptSectionOf({ type: "order", tags: [] }), "grammarReading");
  assert.equal(
    jlptSectionOf({ type: "choice", tags: ["kanji"], passage: "文章" }),
    "grammarReading",
    "a question on a passage is reading, whatever else it is tagged",
  );
  assert.equal(jlptSectionOf({ type: "choice", tags: ["minna:3"] }), null);
});

test("the N5 and N4 review banks place every JLPT-style question in a section", async () => {
  for (const file of ["n5-daily-with-listening.json", "n4-daily-with-listening.json"]) {
    const questions = await loadBank(file);
    const unplaced = questions.filter(
      (question) => question.type !== "dictation" && jlptSectionOf(question) === null,
    );
    assert.deepEqual(
      unplaced.map((question) => question.id),
      [],
      `${file}: questions without a section`,
    );
    const counts = countJlptSections(questions);
    assert.equal(
      counts.listening,
      questions.filter((question) => question.type === "listen").length,
    );
  }
});

test("an N5 exam takes each section's share in the exam order and rotates questions", async () => {
  const bank = await loadBank("n5-daily-with-listening.json");
  const first = composeJlptExam(bank, [], "N5", "class:first");
  assert.deepEqual(first.counts, planJlptExam("N5", countJlptSections(bank)));
  assert.deepEqual(first.counts, { vocabulary: 25, grammarReading: 20, listening: 20 });
  assert.equal(new Set(first.questionIds).size, first.questionIds.length);
  const sectionOf = new Map(bank.map((question) => [question.id, jlptSectionOf(question)]));
  assert.deepEqual(
    [...new Set(first.questionIds.map((id) => sectionOf.get(id)))],
    ["vocabulary", "grammarReading", "listening"],
    "sections come in the exam's order",
  );
  const uses = first.questionIds.map((questionId) => ({
    questionId,
    practiceDate: "2026-11-09",
  }));
  const second = composeJlptExam(bank, uses, "N5", "class:second");
  const reused = (section: string) =>
    second.questionIds.filter(
      (id) => sectionOf.get(id) === section && first.questionIds.includes(id),
    ).length;
  // 43 vocabulary questions: 18 never used come first, so only 7 come back.
  assert.equal(reused("vocabulary"), 7);
  assert.equal(reused("listening"), 0, "65 listening questions cover two exams");
});

test("an N4 exam keeps a reading passage's questions together", async () => {
  const bank = await loadBank("n4-daily-with-listening.json");
  const exam = composeJlptExam(bank, [], "N4", "class:n4");
  assert.equal(exam.questionIds.length, 70);
  const passageOf = new Map(bank.map((question) => [question.id, question.passage]));
  const positions = new Map<string, number[]>();
  exam.questionIds.forEach((id, index) => {
    const passage = passageOf.get(id);
    if (passage) {
      positions.set(passage, [...(positions.get(passage) ?? []), index]);
    }
  });
  assert.ok(positions.size > 0);
  for (const indexes of positions.values()) {
    assert.equal(indexes[indexes.length - 1] - indexes[0], indexes.length - 1);
  }
});

test("a passage asked with several kinds of question still stays together", () => {
  const candidates: JlptExamCandidate[] = [
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `g${index}`,
      type: "choice",
      tags: ["grammar"],
    })),
    { id: "p-choice", type: "choice", tags: ["reading"], passage: "雨の日" },
    { id: "p-fill", type: "fill", tags: ["reading"], passage: "雨の日" },
  ];
  for (const seed of ["a", "b", "c", "d", "e"]) {
    const ids = composeJlptExam(candidates, [], "N4", seed).questionIds;
    const first = ids.indexOf("p-choice");
    const second = ids.indexOf("p-fill");
    assert.ok(first >= 0 && second >= 0);
    assert.equal(Math.abs(first - second), 1, `seed ${seed}: ${ids.join(",")}`);
  }
});

const score = (section: JlptSectionScore["section"], earned: number, max: number) => ({
  section,
  correct: earned,
  total: max,
  earned,
  max,
});

test("the estimate scales to 180 points and applies the pass mark and section minimums", () => {
  assert.deepEqual(
    estimateJlptScore("N5", [
      score("vocabulary", 25, 25),
      score("grammarReading", 20, 20),
      score("listening", 20, 20),
    ]),
    {
      language: 120,
      listening: 60,
      total: 180,
      passMark: 80,
      isPassing: true,
      missesLanguageMinimum: false,
      missesListeningMinimum: false,
    },
  );
  const lowLanguage = estimateJlptScore("N4", [
    score("vocabulary", 7, 25),
    score("grammarReading", 7, 25),
    score("listening", 20, 20),
  ]);
  assert.equal(lowLanguage?.language, 34);
  assert.equal(lowLanguage?.total, 94, "above the N4 pass mark of 90");
  assert.equal(lowLanguage?.isPassing, false, "but under the language minimum of 38");
  const nearlyN5 = estimateJlptScore("N5", [
    score("vocabulary", 9, 25),
    score("grammarReading", 7, 20),
    score("listening", 6, 20),
  ]);
  assert.equal(nearlyN5?.total, 61);
  assert.equal(nearlyN5?.isPassing, false);
  assert.equal(
    estimateJlptScore("N5", [score("vocabulary", 20, 25), score("grammarReading", 18, 20)]),
    null,
    "without listening there is no estimate",
  );
});

test("the countdown names the next JLPT Sunday in Vietnam time", () => {
  assert.deepEqual(findNextJlptSession(new Date("2026-11-09T03:00:00Z")), {
    date: "2026-12-06",
    isConfirmed: true,
    daysLeft: 27,
  });
  assert.equal(
    describeJlptCountdown(new Date("2026-12-05T17:00:00Z")),
    "Hôm nay là ngày thi JLPT, Chủ nhật 06/12/2026.",
    "midnight in Vietnam is already exam day",
  );
  assert.equal(
    describeJlptCountdown(new Date("2026-12-07T01:00:00Z")),
    "Còn 209 ngày tới kỳ thi JLPT, Chủ nhật 04/07/2027 (dự kiến).",
  );
});

test("a timed attempt is handed in at its limit, or a minute before an earlier deadline", () => {
  const started = "2026-11-09T02:00:00.000Z";
  assert.equal(examHandInAt(started, 90, null, false), "2026-11-09T03:30:00.000Z");
  assert.equal(
    examHandInAt(started, 90, "2026-11-09T03:00:00.000Z", false),
    "2026-11-09T02:59:00.000Z",
  );
  assert.equal(
    examHandInAt(started, 90, "2026-11-09T03:00:00.000Z", true),
    "2026-11-09T03:30:00.000Z",
  );
  assert.equal(isExamTimeUp(started, 90, new Date("2026-11-09T03:31:00.000Z")), false);
  assert.equal(isExamTimeUp(started, 90, new Date("2026-11-09T03:31:01.000Z")), true);
  assert.equal(isHandedInAtTimeLimit("2026-11-09T03:30:00+00:00", started, 90), true);
  assert.equal(isHandedInAtTimeLimit("2026-11-09T03:12:00+00:00", started, 90), false);
  assert.equal(formatExamClock(90 * 60 * 1000), "1:30:00");
  assert.equal(formatExamClock(59 * 60 * 1000 + 59_500), "1:00:00");
  assert.equal(formatExamClock(65_000), "1:05");
  assert.equal(formatExamClock(-1000), "0:00");
});
