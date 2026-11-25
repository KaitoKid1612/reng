import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { parseAssignableQuestion, toAttemptItems } from "@/lib/assignment";
import {
  composeJlptExam,
  isOfficialTest,
  countJlptSections,
  currentPacingStep,
  describeAttemptTime,
  estimateJlptScore,
  examHandInAt,
  formatExamClock,
  isExamTimeUp,
  isHandedInAtTimeLimit,
  JLPT_EXAM_MAX_LISTENS,
  officialTestLevel,
  jlptSectionOf,
  planExamPacing,
  planJlptExam,
  planStudyPacing,
} from "@/lib/jlpt";
import {
  jlptFullDailySize,
  jlptPartOf,
  jlptSectionQuestionCount,
  jlptTestParts,
} from "@/lib/jlpt-parts";
import { describeJlptCountdown, findNextJlptSession } from "@/lib/jlpt-sessions";

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
  assert.equal(
    reused("listening"),
    0,
    "40 listening questions in the test's format cover two exams",
  );
});

for (const [file, level] of [
  ["n5-daily-with-listening.json", "N5"],
  ["n4-daily-with-listening.json", "N4"],
] as const) {
  test(`an ${level} exam plays listening in the test's format and part order`, async () => {
    const bank = await loadBank(file);
    const tagsOf = new Map(bank.map((question) => [question.id, question.tags]));
    const exam = composeJlptExam(bank, [], level, `class:${level}:parts`);
    const sectionOf = new Map(bank.map((question) => [question.id, jlptSectionOf(question)]));
    const listening = exam.questionIds.filter((id) => sectionOf.get(id) === "listening");
    // The N4 bank is written in the test's parts, so its exam takes the real test's 28 clips.
    assert.equal(listening.length, level === "N4" ? 28 : 20);
    const formatTag = `jlpt:${level.toLowerCase()}`;
    assert.ok(
      listening.every((id) => tagsOf.get(id)?.includes(formatTag)),
      "no daily-practice clips",
    );
    const parts = listening.map((id) =>
      Number(
        tagsOf
          .get(id)
          ?.find((tag) => tag.startsWith("section:"))
          ?.slice("section:".length),
      ),
    );
    assert.deepEqual(
      parts,
      [...parts].sort((a, b) => a - b),
      "part 1 to part 4",
    );
    assert.ok(new Set(parts).size >= 3, "the exam mixes the parts");
  });
}

test("an official test is taken whole, in its order, at its own level", () => {
  const official = (id: string, type: string, tags: string[]) => ({
    id,
    type,
    tags: [...tags, "official:jlpt-2018"],
    passage: null,
  });
  const bank = [
    official("v1", "choice", ["文字・語彙"]),
    official("g1", "choice", ["文法"]),
    official("r1", "choice", ["読解"]),
    official("l1", "listen", ["listening", "jlpt:n4", "section:1"]),
    official("l2", "listen", ["listening", "jlpt:n4", "section:4"]),
  ];
  assert.ok(isOfficialTest(bank));
  assert.equal(officialTestLevel(bank), "N4");
  const uses = [{ questionId: "v1", practiceDate: "2026-11-09" }];
  const exam = composeJlptExam(bank, uses, "N4", "class:official");
  assert.deepEqual(exam.questionIds, ["v1", "g1", "r1", "l1", "l2"], "no rotation, no quotas");
  assert.deepEqual(exam.counts, { vocabulary: 1, grammarReading: 2, listening: 2 });
  // One question without the tag makes it an ordinary bank again.
  const mixed = [...bank, { id: "x", type: "choice", tags: ["文法"], passage: null }];
  assert.equal(isOfficialTest(mixed), false);
  assert.equal(officialTestLevel([official("v1", "choice", ["文字・語彙"])]), null);
});

test("an exam takes any listening question when the test's format cannot fill the section", () => {
  const listen = (id: string, tags: string[]) => ({ id, type: "listen", tags, passage: null });
  const bank = [
    ...Array.from({ length: 5 }, (_, index) =>
      listen(`format-${index}`, ["listening", "jlpt:n5", "section:2"]),
    ),
    ...Array.from({ length: 20 }, (_, index) => listen(`daily-${index}`, ["listening", "minna:3"])),
  ];
  const exam = composeJlptExam(bank, [], "N5", "class:fallback");
  assert.equal(exam.counts.listening, 20);
  assert.ok(exam.questionIds.some((id) => id.startsWith("daily-")));
  const firstDaily = exam.questionIds.findIndex((id) => id.startsWith("daily-"));
  assert.ok(
    exam.questionIds.slice(firstDaily).every((id) => id.startsWith("daily-")),
    "questions written for a part come before daily-practice clips",
  );
});

test("an N4 exam keeps a reading passage's questions together", async () => {
  const bank = await loadBank("n4-daily-with-listening.json");
  const exam = composeJlptExam(bank, [], "N4", "class:n4");
  assert.equal(exam.questionIds.length, 85);
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

test("the countdown keeps rolling to the next July or December first Sunday, year after year", () => {
  const next = (instant: string) => findNextJlptSession(new Date(instant))?.date;
  assert.equal(next("2027-07-04T16:59:00Z"), "2027-07-04", "still exam day in Vietnam");
  assert.equal(next("2027-07-04T17:00:00Z"), "2027-12-05", "the next day counts to December");
  assert.equal(next("2027-12-06T01:00:00Z"), "2028-07-02", "after December, July next year");
  assert.equal(next("2028-08-01T01:00:00Z"), "2028-12-03");
  assert.equal(next("2031-06-01T01:00:00Z"), "2031-07-06");
  assert.deepEqual(findNextJlptSession(new Date("2029-12-02T01:00:00Z")), {
    date: "2029-12-02",
    isConfirmed: false,
    daysLeft: 0,
  });
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

test("a mock exam plays each clip once; other questions and other assignments are unchanged", async () => {
  const bank = JSON.parse(
    await readFile("content/review-banks/n5-daily-with-listening.json", "utf8"),
  ) as { content: { questions: unknown[] } };
  const questions = bank.content.questions.map((question) => parseAssignableQuestion(question));
  const listen = questions.find((question) => question.type === "listen");
  const dictation = questions.find((question) => question.type === "dictation");
  const choice = questions.find((question) => question.type === "choice");
  assert.ok(listen && dictation && choice);
  const limited = { ...listen, id: "limited", maxListens: 3 };
  const picked = [listen, dictation, choice, limited];
  const listensOf = (items: ReturnType<typeof toAttemptItems>) =>
    items.map((item) => ("maxListens" in item.view ? item.view.maxListens : "none"));

  assert.equal(JLPT_EXAM_MAX_LISTENS, 1);
  assert.deepEqual(listensOf(toAttemptItems(picked, "test", JLPT_EXAM_MAX_LISTENS)), [
    1,
    1,
    "none",
    1,
  ]);
  assert.deepEqual(listensOf(toAttemptItems(picked, "test")), [null, null, "none", 3]);
  // The snapshot itself keeps its own setting for the results page and later reports.
  assert.equal(listen.maxListens, null);
});

test("pacing splits the exam's time like the real test and follows the clock", () => {
  const start = "2026-11-10T12:00:00.000Z";
  const n4 = [
    ...Array<"vocabulary">(25).fill("vocabulary"),
    ...Array<"grammarReading">(25).fill("grammarReading"),
    ...Array<"listening">(20).fill("listening"),
  ];
  const steps = planExamPacing("N4", 115, n4, start);
  assert.deepEqual(
    steps.map((step) => [step.section, step.firstPosition, step.lastPosition, step.minutes]),
    [
      ["vocabulary", 1, 25, 25],
      ["grammarReading", 26, 50, 55],
      ["listening", 51, 70, 35],
    ],
  );
  assert.equal(steps[1].endsAt, "2026-11-10T13:20:00.000Z");
  const at = (minutes: number) => Date.parse(start) + minutes * 60_000;
  assert.equal(currentPacingStep(steps, at(0))?.section, "vocabulary");
  assert.equal(currentPacingStep(steps, at(25))?.section, "grammarReading");
  assert.equal(currentPacingStep(steps, at(80))?.section, "listening");
  assert.equal(currentPacingStep(steps, at(200))?.section, "listening", "the last share holds");

  // A shorter exam keeps the proportions; the last section takes what is left.
  assert.deepEqual(
    planExamPacing("N5", 60, n4, start).map((step) => step.minutes),
    [13, 27, 20],
  );
  // A bank without listening splits the time over the two sections it has.
  assert.deepEqual(
    planExamPacing("N4", 115, n4.slice(0, 50), start).map((step) => step.minutes),
    [36, 79],
  );
  // No pacing for one section, or when a section comes back after another.
  assert.deepEqual(planExamPacing("N4", 115, n4.slice(0, 25), start), []);
  assert.deepEqual(planExamPacing("N4", 115, ["vocabulary", "listening", "vocabulary"], start), []);
});

test("a JLPT-format daily set is timed against the real test for the same questions", () => {
  const start = "2026-11-17T12:00:00.000Z";
  assert.equal(jlptSectionQuestionCount("N4", "vocabulary"), 28);
  assert.equal(jlptSectionQuestionCount("N4", "grammarReading"), 29);
  assert.equal(jlptSectionQuestionCount("N4", "listening"), 28);
  // The full N4 daily set: every language and reading question of a test plus 10 listening.
  const daily = [
    ...Array<"vocabulary">(28).fill("vocabulary"),
    ...Array<"grammarReading">(29).fill("grammarReading"),
    ...Array<"listening">(10).fill("listening"),
  ];
  assert.equal(daily.length, jlptFullDailySize("N4"));
  const steps = planStudyPacing("N4", daily, start);
  assert.deepEqual(
    steps.map((step) => [step.section, step.firstPosition, step.lastPosition, step.minutes]),
    [
      ["vocabulary", 1, 28, 25],
      ["grammarReading", 29, 57, 55],
      ["listening", 58, 67, 13],
    ],
  );
  assert.equal(steps.at(-1)?.endsAt, "2026-11-17T13:33:00.000Z");
  // A smaller set gets a smaller share; a set out of test order gets no clock.
  assert.deepEqual(
    planStudyPacing("N4", [...daily.slice(0, 14), ...daily.slice(28, 43)], start).map(
      (step) => step.minutes,
    ),
    [13, 28],
  );
  assert.deepEqual(planStudyPacing("N4", ["vocabulary", "listening", "vocabulary"], start), []);
});

test("the time an attempt took reads in minutes and hours, within one sitting", () => {
  const start = "2026-11-17T12:00:00.000Z";
  assert.equal(describeAttemptTime(start, "2026-11-17T12:52:20.000Z"), "52 phút");
  assert.equal(describeAttemptTime(start, "2026-11-17T13:05:00.000Z"), "1 giờ 5 phút");
  assert.equal(describeAttemptTime(start, "2026-11-17T12:00:10.000Z"), "1 phút");
  assert.equal(describeAttemptTime(start, null), null);
  // Left open overnight, or a clock that went backwards: no figure at all.
  assert.equal(describeAttemptTime(start, "2026-11-18T08:00:00.000Z"), null);
  assert.equal(describeAttemptTime(start, "2026-11-17T11:00:00.000Z"), null);
});

test("a bank written in the test's parts gives the real test's size and part order", async () => {
  const bank = await loadBank("n4-daily-with-listening.json");
  const first = composeJlptExam(bank, [], "N4", "class:parts");
  assert.deepEqual(first.counts, { vocabulary: 28, grammarReading: 29, listening: 28 });
  const partOf = new Map(bank.map((question) => [question.id, jlptPartOf(question)?.tag]));
  const order = jlptTestParts("N4").map(({ part }) => part.tag);
  const sequence = first.questionIds.map((id) => order.indexOf(partOf.get(id) ?? ""));
  assert.deepEqual(
    sequence,
    sequence.toSorted((a, b) => a - b),
    "parts in test order",
  );
  for (const { part, count } of jlptTestParts("N4")) {
    assert.equal(sequence.filter((index) => order[index] === part.tag).length, count, part.tag);
  }
  // A second exam of the class takes questions the first one did not.
  const uses = first.questionIds.map((questionId) => ({ questionId, practiceDate: "2026-11-19" }));
  const second = composeJlptExam(bank, uses, "N4", "class:parts:2");
  const shared = second.questionIds.filter((id) => first.questionIds.includes(id));
  assert.equal(shared.length, 0);
  // A bank short of one part falls back to the section shares.
  const short = bank.filter((question) => !question.tags.includes("info-search"));
  assert.equal(composeJlptExam(short, [], "N4", "class:short").questionIds.length, 70);
});
