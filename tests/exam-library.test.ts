import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { countBankExams, describeExamSource, examTitleFor } from "@/lib/exam-library";

import type { JlptExamCandidate } from "@/lib/jlpt";

async function load(path: string): Promise<JlptExamCandidate[]> {
  const data = JSON.parse(await readFile(path, "utf8"));
  return data.content.questions.map(
    (question: { id: string; type: string; tags: string[]; passage?: string }) => ({
      id: question.id,
      type: question.type,
      tags: question.tags,
      passage: question.passage ?? null,
    }),
  );
}

test("an official workbook test is one exam of its level and year", async () => {
  const source = describeExamSource(
    "n4-2012",
    "Đề N4",
    await load("content/jlpt/official/n4-2012.json"),
  );
  assert.deepEqual(source, {
    kind: "official",
    lessonId: "n4-2012",
    lessonTitle: "Đề N4",
    level: "N4",
    year: 2012,
  });
  assert.ok(source);
  assert.equal(examTitleFor(source, 0), "Đề chính thức JLPT N4 (2012)");
});

test("a bank in the test's parts makes as many exams as its scarcest part, less those used", async () => {
  const bank = await load("content/review-banks/n4-daily-with-listening.json");
  const source = describeExamSource("bank", "Tổng ôn N4", bank);
  assert.ok(source?.kind === "bank");
  assert.equal(source.level, "N4");
  // 60 listening questions fill two tests of 28.
  assert.equal(source.totalExams, 2);
  assert.equal(source.remainingExams, 2);
  const used = new Set(
    bank
      .filter((question) => question.tags.includes("section:4"))
      .slice(0, 9)
      .map((question) => question.id),
  );
  assert.equal(countBankExams(bank, "N4", used).remaining, 1);
  assert.equal(source.variant, null);
  assert.equal(examTitleFor(source, 1), "Đề Reng N4 số 2");
  // A bank of exam sets names its kind in the title.
  const advanced = bank.map((question) => ({
    ...question,
    tags: [...question.tags, "reng-exam:advanced"],
  }));
  const named = describeExamSource("adv", "Đề nâng cao", advanced);
  assert.ok(named?.kind === "bank");
  assert.equal(examTitleFor(named, 0), "Đề Reng N4 nâng cao số 1");
});

test("a bank written by lesson, not by the test's parts, makes no exam", async () => {
  assert.equal(
    describeExamSource("minna", "Minna", await load("content/review-banks/n5-minna-1-25.json")),
    null,
  );
  assert.equal(describeExamSource("empty", "Trống", []), null);
});
