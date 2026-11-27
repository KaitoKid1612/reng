import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";

import { parseAssignableQuestion } from "../lib/assignment";
import { BUNDLED_LISTENING_AUDIO } from "../lib/bundled-listening";
import { describeExamSource, examTitleFor } from "../lib/exam-library";
import {
  composeJlptExam,
  countJlptSections,
  isOfficialTest,
  jlptSectionOf,
  officialTestLevel,
} from "../lib/jlpt";
import { findFuriganaProblems } from "../lib/lesson-draft";
import { lessonDraftSchema } from "../lib/lesson-schema";
import { RECORDED_AUDIO_VOICE, recordedAudioHash } from "../lib/recorded-audio";

// Whole N4 tests given by the user (content/jlpt/tests/): taken whole, in their booklet's order,
// with listening clips cut from each test's own recording.
const TESTS = [
  {
    id: "n4-2025-07",
    title: "Đề JLPT N4 tháng 07/2025",
    counts: { vocabulary: 28, grammarReading: 29, listening: 28 },
    // The option number (1–4) of each answer, by section and もんだい.
    answers: {
      v: [
        [3, 4, 1, 2, 2, 3, 1],
        [2, 3, 4, 2, 1],
        [4, 2, 1, 3, 2, 1, 4, 4],
        [2, 2, 3, 3],
        [1, 1, 4, 2],
      ],
      g: [
        [4, 3, 3, 2, 4, 4, 2, 1, 2, 1, 2, 3, 4],
        [3, 4, 1, 1],
        [1, 4, 2, 3],
        [3, 4, 4],
        [1, 3, 2],
        [1, 2],
      ],
      l: [
        [1, 4, 3, 1, 2, 2, 1, 2],
        [3, 2, 2, 1, 4, 2, 1],
        [3, 1, 2, 1, 2],
        [2, 2, 1, 3, 2, 3, 1, 2],
      ],
    },
  },
  {
    // 文字・語彙 6–10 were missing from the supplied pages.
    id: "n4-2025-12",
    title: "Đề JLPT N4 tháng 12/2025",
    counts: { vocabulary: 23, grammarReading: 29, listening: 28 },
    answers: {
      v: [
        [2, 1, 4, 3, 1],
        [2, 1],
        [2, 3, 4, 1, 2, 2, 3, 4],
        [1, 3, 1, 4],
        [2, 3, 1, 2],
      ],
      g: [
        [2, 1, 3, 3, 1, 4, 1, 4, 2, 4, 3, 1, 2],
        [3, 3, 1, 2],
        [1, 4, 3, 2],
        [3, 1, 3],
        [1, 4, 4],
        [2, 2],
      ],
      l: [
        [4, 2, 1, 3, 2, 3, 4, 1],
        [4, 3, 4, 2, 1, 1, 3],
        [3, 2, 1, 2, 1],
        [2, 3, 1, 2, 2, 1, 3, 1],
      ],
    },
  },
] as const;

async function exists(path: string) {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

for (const { id, title, counts, answers } of TESTS) {
  test(`the N4 test ${id} is whole, in order, with its recorded listening`, async () => {
    const lesson = lessonDraftSchema.parse(
      JSON.parse(await readFile(`content/jlpt/tests/${id}.json`, "utf8")),
    );
    const questions = lesson.content.questions;
    questions.forEach((question) => parseAssignableQuestion(question));
    assert.deepEqual(countJlptSections(questions), counts);
    assert.ok(isOfficialTest(questions));
    assert.equal(officialTestLevel(questions), "N4");
    assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
    assert.deepEqual(
      [...new Set(questions.map((question) => jlptSectionOf(question)))],
      ["vocabulary", "grammarReading", "listening"],
    );
    for (const [prefix, key] of Object.entries(answers)) {
      assert.deepEqual(
        questions
          .filter((question) => question.id.startsWith(`${id}-${prefix}-`))
          .map((question) => (question.answer as number[])[0] + 1),
        key.flat(),
        prefix,
      );
    }

    for (const question of questions) {
      assert.ok(question.instruction, `${question.id} has its もんだい heading`);
      assert.ok(question.tags.includes(`official:${id}`), question.id);
      assert.equal(question.source, undefined, question.id);
      if (question.image) {
        assert.ok(await exists(`public${question.image}`), `${question.id} image`);
      }
      if (question.type !== "listen") {
        continue;
      }
      // Each clip is named by its own content and registered as a recording, not a voice.
      const path = `public/audio/lessons/${question.audio}.mp3`;
      assert.ok(question.audio && (await exists(path)), `${question.id} audio file`);
      assert.equal(recordedAudioHash(await readFile(path)), question.audio, question.id);
      assert.equal(BUNDLED_LISTENING_AUDIO.get(question.audio)?.voice, RECORDED_AUDIO_VOICE);
      const part = Number(question.tags.find((tag) => tag.startsWith("section:"))?.slice(8));
      assert.equal(question.options?.length, part <= 2 ? 4 : 3, question.id);
    }
    assert.deepEqual(findFuriganaProblems(questions), []);

    const candidates = questions.map((question) => ({
      id: question.id,
      type: question.type,
      tags: question.tags,
      passage: question.passage ?? null,
    }));
    const exam = composeJlptExam(candidates, [], "N4", "official:N4");
    assert.deepEqual(
      exam.questionIds,
      questions.map((question) => question.id),
    );
    // The exam library names it by its own title, not as a jlpt.jp workbook.
    const source = describeExamSource("lesson", lesson.title, candidates);
    assert.ok(source?.kind === "official" && source.year === null);
    assert.equal(examTitleFor(source, 0), title);
  });
}
