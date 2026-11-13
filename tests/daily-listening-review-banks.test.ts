import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";

import { parseAssignableQuestion } from "../lib/assignment";
import { BUNDLED_LISTENING_AUDIO } from "../lib/bundled-listening";
import { selectDailyQuestionsWithListeningQuota } from "../lib/daily-practice";
import { gradeQuestion } from "../lib/grading/grade";
import { lessonDraftSchema } from "../lib/lesson-schema";

const banks = [
  {
    file: "content/review-banks/n4-daily-with-listening.json",
    // Rewritten in the JLPT test's format on 13/11/2026: the six reviewed originals became
    // exam-format questions with n4-jlpt- ids, and only the 60 exam-format clips stayed.
    expectedTotal: 479,
    expectedListening: 60,
    expectedOriginals: 0,
    dailySize: 67,
    dailyListening: 10,
  },
  {
    file: "content/review-banks/n5-daily-with-listening.json",
    expectedTotal: 184,
    expectedListening: 118,
    expectedOriginals: 6,
    dailySize: 60,
    dailyListening: 8,
  },
] as const;

for (const config of banks) {
  test(`${config.file}: valid, audio-backed, assignable and correctly quota-selected`, async () => {
    const bank = lessonDraftSchema.parse(JSON.parse(await readFile(config.file, "utf8")));
    const questions = bank.content.questions;
    assert.equal(questions.length, config.expectedTotal);
    assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
    const audio = questions.filter(
      (question) => question.type === "listen" || question.type === "dictation",
    );
    assert.equal(audio.length, config.expectedListening);
    // The reviewed original JLPT-style questions (content/jlpt) are part of the bank.
    assert.equal(
      questions.filter((question) => question.id.startsWith("jlpt-")).length,
      config.expectedOriginals,
    );
    // Every clip comes from a bundled listening set whose audio is current, so publishing the
    // bank (app or npm run bank:sql) can register it.
    for (const question of audio) {
      const hash = "audio" in question ? question.audio : null;
      assert.ok(hash && BUNDLED_LISTENING_AUDIO.has(hash), question.id);
      const file = await stat(`public/audio/lessons/${hash}.mp3`);
      assert.ok(file.size > 100, hash);
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
    const candidates = questions.map((question) => ({
      id: question.id,
      type: question.type,
      tags: question.tags,
    }));
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
      const audioIds = new Set(audio.map((question) => question.id));
      assert.equal(ids.filter((id) => audioIds.has(id)).length, config.dailyListening);
    }
  });
}
