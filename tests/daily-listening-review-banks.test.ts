import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";

import { parseAssignableQuestion } from "../lib/assignment";
import { selectDailyQuestionsWithListeningQuota } from "../lib/daily-practice";
import { gradeQuestion } from "../lib/grading/grade";
import { lessonDraftSchema } from "../lib/lesson-schema";
import { findListeningAudio, parseListeningSet } from "../lib/listening-set";

const banks = [
  {
    file: "content/review-banks/n4-daily-with-listening.json",
    listeningFile: "content/listening/n4-daily.json",
    expectedTotal: 324,
    expectedListening: 20,
    dailySize: 70,
    dailyListening: 10,
  },
  {
    file: "content/review-banks/n5-daily-with-listening.json",
    listeningFile: "content/listening/n5-daily-1-13.json",
    expectedTotal: 138,
    expectedListening: 78,
    dailySize: 60,
    dailyListening: 8,
  },
] as const;

for (const config of banks) {
  test(`${config.file}: valid, audio-backed, assignable and correctly quota-selected`, async () => {
    const bank = lessonDraftSchema.parse(JSON.parse(await readFile(config.file, "utf8")));
    const set = parseListeningSet(JSON.parse(await readFile(config.listeningFile, "utf8")));
    const questions = bank.content.questions;
    assert.equal(questions.length, config.expectedTotal);
    assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
    const audio = questions.filter((q) => q.type === "listen" || q.type === "dictation");
    assert.equal(audio.length, config.expectedListening);
    const audit = findListeningAudio(set);
    assert.deepEqual(audit.missing, []);
    assert.deepEqual(audit.stale, []);
    assert.equal(audit.assets.length, config.expectedListening);
    for (const asset of audit.assets) {
      const file = await stat(`public/audio/lessons/${asset.hash}.mp3`);
      assert.ok(file.size > 100, asset.hash);
    }
    for (const raw of questions) {
      const question = parseAssignableQuestion(raw);
      if (question.type === "listen" || question.type === "dictation") {
        let answer: string | number[];
        if (question.type === "dictation") {
          answer = question.transcript;
        } else if (question.responseType === "choice") {
          answer = question.answer.filter((value): value is number => typeof value === "number");
        } else {
          answer = String(question.answer[0]);
        }
        assert.equal(gradeQuestion(question, answer).isCorrect, true, question.id);
      }
    }
    const candidates = questions.map((q) => ({ id: q.id, type: q.type, tags: q.tags }));
    for (const seed of ["2026-11-08", "2026-11-09", "2026-11-10"]) {
      const ids = selectDailyQuestionsWithListeningQuota(
        candidates,
        [],
        config.dailySize,
        seed,
        config.dailyListening,
      );
      assert.equal(ids.length, config.dailySize);
      assert.equal(new Set(ids).size, ids.length);
      const audioIds = new Set(audio.map((q) => q.id));
      assert.equal(ids.filter((id) => audioIds.has(id)).length, config.dailyListening);
    }
  });
}
