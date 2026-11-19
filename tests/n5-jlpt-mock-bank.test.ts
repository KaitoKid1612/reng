import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { describeExamSource } from "@/lib/exam-library";
import { composeJlptExam } from "@/lib/jlpt";
import { jlptPartOf, jlptTestParts } from "@/lib/jlpt-parts";

interface BankQuestion {
  id: string;
  type: string;
  tags: string[];
  passage?: string;
  audio?: string;
  options: string[];
  answer: number[];
}

async function loadBank(): Promise<BankQuestion[]> {
  const data = JSON.parse(await readFile("content/review-banks/n5-jlpt-mock.json", "utf8"));
  return data.content.questions;
}

const candidates = (bank: BankQuestion[]) =>
  bank.map((question) => ({
    id: question.id,
    type: question.type,
    tags: question.tags,
    passage: question.passage ?? null,
  }));

test("the N5 mock bank fills three whole N5 tests, part by part", async () => {
  const bank = await loadBank();
  assert.equal(new Set(bank.map((question) => question.id)).size, bank.length);
  const parts = new Map<string, number>();
  for (const question of bank) {
    const part = jlptPartOf(question);
    assert.ok(part, `${question.id} has a part`);
    parts.set(part.tag, (parts.get(part.tag) ?? 0) + 1);
  }
  for (const { part, count } of jlptTestParts("N5")) {
    assert.ok((parts.get(part.tag) ?? 0) >= count * 3, `${part.tag}: three tests`);
  }
  const source = describeExamSource("n5", "Đề Reng N5", candidates(bank));
  assert.ok(source?.kind === "bank");
  assert.equal(source.level, "N5");
  assert.equal(source.totalExams, 3);
});

test("three exams from the bank are the real test's size and share no question", async () => {
  const bank = candidates(await loadBank());
  const seen = new Set<string>();
  for (const round of [1, 2, 3]) {
    const uses = [...seen].map((questionId) => ({ questionId, practiceDate: "2026-11-19" }));
    const exam = composeJlptExam(bank, uses, "N5", `class:n5:${round}`);
    assert.deepEqual(exam.counts, { vocabulary: 21, grammarReading: 22, listening: 24 });
    assert.ok(
      exam.questionIds.every((id) => !seen.has(id)),
      `exam ${round} repeats nothing`,
    );
    exam.questionIds.forEach((id) => seen.add(id));
  }
});

test("every listening question has its MP3 and every choice a valid key", async () => {
  for (const question of await loadBank()) {
    if (question.type === "listen") {
      assert.ok(question.audio, question.id);
      assert.ok(existsSync(`public/audio/lessons/${question.audio}.mp3`), question.id);
    }
    assert.equal(question.answer.length, 1, question.id);
    assert.ok(question.answer[0] >= 0 && question.answer[0] < question.options.length, question.id);
  }
});
