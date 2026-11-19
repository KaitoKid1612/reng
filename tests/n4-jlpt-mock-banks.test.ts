import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { describeExamSource, examTitleFor } from "@/lib/exam-library";
import { composeJlptExam } from "@/lib/jlpt";

interface BankQuestion {
  id: string;
  type: string;
  tags: string[];
  passage?: string;
  audio?: string;
  options: string[];
  answer: number[];
}

async function loadBank(file: string): Promise<BankQuestion[]> {
  const data = JSON.parse(await readFile(`content/review-banks/${file}`, "utf8"));
  return data.content.questions;
}

const candidates = (bank: BankQuestion[]) =>
  bank.map((question) => ({
    id: question.id,
    type: question.type,
    tags: question.tags,
    passage: question.passage ?? null,
  }));

for (const [kind, label] of [
  ["standard", "chuẩn"],
  ["advanced", "nâng cao"],
] as const) {
  test(`the N4 ${kind} bank makes two whole N4 tests that share no question`, async () => {
    const bank = await loadBank(`n4-jlpt-mock-${kind}.json`);
    assert.equal(new Set(bank.map((question) => question.id)).size, bank.length);
    assert.ok(bank.every((question) => question.tags.includes(`reng-exam:${kind}`)));
    const source = describeExamSource("bank", "", candidates(bank));
    assert.ok(source?.kind === "bank");
    assert.equal(source.totalExams, 2);
    assert.equal(examTitleFor(source, 0), `Đề Reng N4 ${label} số 1`);
    const first = composeJlptExam(candidates(bank), [], "N4", `${kind}:1`);
    assert.deepEqual(first.counts, { vocabulary: 28, grammarReading: 29, listening: 28 });
    const uses = first.questionIds.map((questionId) => ({
      questionId,
      practiceDate: "2026-11-19",
    }));
    const second = composeJlptExam(candidates(bank), uses, "N4", `${kind}:2`);
    assert.equal(second.questionIds.filter((id) => first.questionIds.includes(id)).length, 0);
    for (const question of bank) {
      if (question.type === "listen") {
        assert.ok(existsSync(`public/audio/lessons/${question.audio}.mp3`), question.id);
      }
      assert.ok(
        question.answer[0] >= 0 && question.answer[0] < question.options.length,
        question.id,
      );
    }
  });
}

test("the exam banks repeat no question id of each other or of the daily N4 bank", async () => {
  const ids = [
    ...(await loadBank("n4-jlpt-mock-standard.json")),
    ...(await loadBank("n4-jlpt-mock-advanced.json")),
    ...(await loadBank("n4-daily-with-listening.json")),
  ].map((question) => question.id);
  assert.equal(new Set(ids).size, ids.length);
});
