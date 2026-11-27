import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { describeFixedExamSources, examTitleFor } from "@/lib/exam-library";
import { fixedJlptExam, jlptSectionOf, jlptTestSectionCounts } from "@/lib/jlpt";
import {
  examSetKindOf,
  findJlptExamSet,
  fixedRengExamSets,
  JLPT_EXAM_SETS,
  jlptExamSetNumber,
} from "@/lib/jlpt-exam-sets";
import { jlptPartOf, jlptTestParts } from "@/lib/jlpt-parts";

import type { LessonQuestion } from "@/lib/lesson-schema";

const BANK_FILES = {
  N5: "content/review-banks/n5-jlpt-mock.json",
  N4: "content/review-banks/n4-jlpt-mock-standard.json",
};

async function questionIdsOf(path: string) {
  const data = JSON.parse(await readFile(path, "utf8"));
  return new Set<string>(data.content.questions.map((question: { id: string }) => question.id));
}

function choiceAnswer(question: LessonQuestion) {
  const answer = question.answer;
  assert.ok(Array.isArray(answer) && answer.length === 1, `${question.id} has one answer`);
  assert.equal(typeof answer[0], "number", `${question.id} answers with an option`);
  return answer[0] as number;
}

test("each level prints the official tests, then the supplied tests, then Reng's mock exam", () => {
  assert.deepEqual(
    JLPT_EXAM_SETS.map((set) => `${set.id} Đề ${jlptExamSetNumber(set)}`),
    [
      "n5-2018 Đề 1",
      "n5-2012 Đề 2",
      "reng-n5-1 Đề 3",
      "n4-2018 Đề 1",
      "n4-2012 Đề 2",
      "n4-2025-07 Đề 3",
      "n4-2025-12 Đề 4",
      "n4-2026-07 Đề 5",
      "reng-n4-1 Đề 6",
    ],
  );
  assert.deepEqual(
    JLPT_EXAM_SETS.map((set) => set.questions.length),
    [91, 89, 67, 98, 97, 85, 80, 70, 85],
  );
  for (const set of fixedRengExamSets()) {
    assert.match(set.title, /^Đề thi thử Reng N[45] số \d+$/);
    assert.doesNotMatch(set.title, /tháng|năm|20\d\d|đề thi cũ/i);
  }
});

test("an exam a class opened prints with the cover of its kind", () => {
  for (const set of JLPT_EXAM_SETS) {
    assert.equal(examSetKindOf(set.questions), set.kind, set.id);
  }
});

test("a fixed Reng exam has the real test's parts, counts and order", () => {
  for (const set of fixedRengExamSets()) {
    const expected = jlptTestParts(set.level).flatMap(({ part, count }) =>
      Array.from({ length: count }, () => part.tag),
    );
    assert.deepEqual(
      set.questions.map((question) => jlptPartOf(question)?.tag),
      expected,
      set.id,
    );
    const counts = { vocabulary: 0, grammarReading: 0, listening: 0 };
    for (const question of set.questions) {
      const section = jlptSectionOf(question);
      assert.ok(section, question.id);
      counts[section] += 1;
    }
    assert.deepEqual(counts, jlptTestSectionCounts(set.level), set.id);
  }
});

test("fixed Reng exams never repeat a question and keep each reading passage whole", async () => {
  const seen = new Set<string>();
  for (const set of fixedRengExamSets()) {
    for (const question of set.questions) {
      assert.ok(!seen.has(question.id), `${question.id} appears twice`);
      seen.add(question.id);
    }
    const file = BANK_FILES[set.level];
    const bank = JSON.parse(await readFile(file, "utf8")) as {
      content: { questions: LessonQuestion[] };
    };
    const chosen = new Set(set.questions.map((question) => question.id));
    for (const passage of new Set(set.questions.map((question) => question.passage))) {
      if (!passage) {
        continue;
      }
      const group = bank.content.questions.filter((question) => question.passage === passage);
      assert.ok(
        group.every((question) => chosen.has(question.id)),
        `${set.id} takes every question of a passage`,
      );
    }
  }
});

test("fixed Reng exams avoid the questions of the class's daily review banks", async () => {
  const daily = {
    N5: [
      ...(await questionIdsOf("content/review-banks/n5-daily-with-listening.json")),
      ...(await questionIdsOf("content/review-banks/n5-minna-1-25.json")),
    ],
    N4: [...(await questionIdsOf("content/review-banks/n4-daily-with-listening.json"))],
  };
  for (const set of fixedRengExamSets()) {
    const reviewed = new Set(daily[set.level]);
    assert.deepEqual(
      set.questions.filter((question) => reviewed.has(question.id)).map((question) => question.id),
      [],
      set.id,
    );
  }
});

test("every exam question has one answer among its options, spread over the positions", () => {
  for (const set of JLPT_EXAM_SETS) {
    const positions = new Map<number, number>();
    for (const question of set.questions) {
      const answer = choiceAnswer(question);
      assert.ok("options" in question && question.options, question.id);
      assert.ok(answer < question.options.length, `${question.id} answer is an option`);
      assert.equal(new Set(question.options).size, question.options.length, question.id);
      positions.set(answer, (positions.get(answer) ?? 0) + 1);
    }
    if (set.kind === "reng") {
      // No position takes more than a third of the answers, nor fewer than a sixth.
      for (const position of [0, 1, 2, 3]) {
        const share = (positions.get(position) ?? 0) / set.questions.length;
        assert.ok(share > 1 / 6 && share < 1 / 3, `${set.id} position ${position + 1}: ${share}`);
      }
    }
  }
});

test("every listening question of an exam has a recording that ships with the web", async () => {
  for (const set of JLPT_EXAM_SETS) {
    for (const question of set.questions) {
      if (question.type !== "listen") {
        continue;
      }
      await assert.doesNotReject(
        readFile(`public/audio/lessons/${question.audio}.mp3`),
        `${set.id} ${question.id}`,
      );
    }
  }
});

test("a class that pins the bank can open the fixed exam with exactly its questions", async () => {
  const bankIds = await questionIdsOf("content/review-banks/n5-jlpt-mock.json");
  const sources = describeFixedExamSources("n5-jlpt-mock-bank", "Đề Reng N5", bankIds, [
    ...fixedRengExamSets(),
  ]);
  assert.equal(sources.length, 1);
  const [source] = sources;
  assert.equal(source.kind, "fixed");
  assert.equal(examTitleFor(source, 0), "Đề thi thử Reng N5 số 1");
  const missingOne = new Set(bankIds);
  missingOne.delete("n5-mock-41");
  assert.deepEqual(
    describeFixedExamSources("bank", "Đề Reng N5", missingOne, [...fixedRengExamSets()]),
    [],
  );

  const set = findJlptExamSet("reng-n5-1");
  assert.ok(set);
  const candidates = set.questions.map((question) => ({
    id: question.id,
    type: question.type,
    tags: question.tags,
    passage: question.passage ?? null,
  }));
  const ids = set.questions.map((question) => question.id);
  assert.deepEqual(fixedJlptExam(candidates, ids), {
    questionIds: ids,
    counts: { vocabulary: 21, grammarReading: 22, listening: 24 },
  });
  assert.deepEqual(fixedJlptExam(candidates.slice(1), ids).questionIds, []);
});
