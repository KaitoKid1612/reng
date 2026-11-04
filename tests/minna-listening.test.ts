import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  draftContentSchema,
  findPublishProblems,
  parseLessonDraftState,
} from "../lib/lesson-draft";
import { listeningAudioRegistry, parseListeningSet } from "../lib/listening-set";
import {
  guessMinnaLesson,
  MINNA_LISTENING_LESSONS,
  minnaLessonOf,
  minnaListeningQuestions,
} from "../lib/minna-listening";

test("each Minna lesson 1–15 has its own six listening questions with audio", () => {
  assert.deepEqual(
    MINNA_LISTENING_LESSONS,
    Array.from({ length: 15 }, (_, index) => index + 1),
  );
  const lesson3 = minnaListeningQuestions(3);
  assert.equal(lesson3.length, 6);
  for (const question of lesson3) {
    assert.equal(minnaLessonOf(question), 3);
    assert.ok(question.type === "listen" || question.type === "dictation");
    assert.ok(question.audio, question.id);
    // Inside lesson 3 the "(Bài 3)" label is dropped; the minna:3 tag keeps the link.
    assert.equal(question.prompt.startsWith("(Bài"), false, question.prompt);
  }
  assert.equal(lesson3[0].prompt, "Nhà ăn ở đâu?");
});

test("the lesson title picks the matching set, other titles leave it to the teacher", () => {
  assert.equal(guessMinnaLesson("Bài 3 – Nơi chốn và mua sắm"), 3);
  assert.equal(guessMinnaLesson(" Bài 15 – Xin phép"), 15);
  assert.equal(guessMinnaLesson("Bài 16 – Thể て"), null);
  assert.equal(guessMinnaLesson("Tổng ôn N4"), null);
});

test("a Minna lesson with its listening questions added is ready to publish", async () => {
  const starter = JSON.parse(await readFile("content/starters/minna-1-03.json", "utf8"));
  const content = draftContentSchema.parse(starter.content);
  const state = parseLessonDraftState({
    metadata: {
      title: starter.title,
      titleJa: starter.titleJa,
      summary: starter.summary,
      order: starter.order,
      courseId: starter.courseId,
    },
    content: { ...content, questions: [...content.questions, ...minnaListeningQuestions(3)] },
  });
  assert.deepEqual(findPublishProblems(state), []);
});

test("publishing can register every bundled listening audio as a served file", async () => {
  const set = parseListeningSet(
    JSON.parse(await readFile("content/listening/minna-1-15.json", "utf8")),
  );
  const registry = listeningAudioRegistry([set]);
  assert.equal(registry.size, 90);
  for (const question of minnaListeningQuestions(7)) {
    assert.ok(question.type === "listen" || question.type === "dictation");
    const row = registry.get(question.audio ?? "");
    assert.ok(row, question.id);
    assert.equal(row.url, `/audio/lessons/${question.audio}.mp3`);
    assert.equal(row.text, question.transcript);
  }
});
