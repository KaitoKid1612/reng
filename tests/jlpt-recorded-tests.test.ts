import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";

import { parseAssignableQuestion } from "../lib/assignment";
import { BUNDLED_LISTENING_AUDIO } from "../lib/bundled-listening";
import { describeExamSource, examTitleFor } from "../lib/exam-library";
import { describeExamTime } from "../lib/exam-print";
import {
  composeJlptExam,
  countJlptSections,
  isOfficialTest,
  jlptExamMinutes,
  jlptSectionOf,
  officialTestLevel,
} from "../lib/jlpt";
import { findJlptExamSet } from "../lib/jlpt-exam-sets";
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
  {
    // The real N4 test of 07/2026 as far as its pages were supplied: no 読解 and no
    // listening もんだい２ yet. Answers are Reng's own (no answer key came with it).
    id: "n4-2026-07-exam",
    title: "Đề JLPT N4 tháng 07/2026",
    counts: { vocabulary: 28, grammarReading: 21, listening: 21 },
    answers: {
      v: [
        [2, 4, 4, 3, 1, 2, 1],
        [3, 2, 1, 1, 4],
        [1, 3, 4, 2, 4, 3, 4, 2],
        [4, 1, 1, 2],
        [3, 3, 2, 1],
      ],
      g: [
        [3, 1, 2, 4, 2, 3, 4, 1, 4, 3, 2, 1, 3],
        [3, 1, 4, 2],
        [3, 1, 2, 4],
      ],
      l: [
        [4, 2, 2, 3, 4, 1, 2, 1],
        [2, 1, 3, 1, 2],
        [1, 3, 1, 2, 2, 2, 1, 3],
      ],
    },
  },
  {
    // A book's reference test: the written part only, checked against the book's answer key.
    id: "n4-2026-07",
    title: "Đề luyện N4 (sách tham khảo) – Đề 1",
    counts: { vocabulary: 35, grammarReading: 35, listening: 0 },
    answers: {
      v: [
        [4, 2, 1, 3, 2, 4, 3, 3, 2],
        [1, 2, 4, 4, 3, 1],
        [3, 1, 4, 2, 4, 1, 2, 3, 4, 1],
        [3, 4, 2, 2, 1],
        [1, 3, 2, 4, 3],
      ],
      g: [
        [2, 3, 4, 1, 1, 3, 4, 1, 4, 2, 3, 1, 4, 2, 3],
        [1, 4, 2, 4, 3],
        [2, 4, 3, 2, 1],
        [2, 2, 1, 3],
        [1, 3, 4, 3],
        [2, 4],
      ],
    },
  },
  {
    // The same book's second test, whose listening script is read by synthetic voices
    // (content/listening/jlpt-n4-2026-07-2.json); every answer is the book's key.
    id: "n4-2026-07-2",
    title: "Đề luyện N4 (sách tham khảo) – Đề 2",
    counts: { vocabulary: 35, grammarReading: 35, listening: 28 },
    voiced: true,
    answers: {
      v: [
        [4, 3, 3, 2, 4, 4, 2, 3, 3],
        [1, 2, 3, 4, 1, 3],
        [2, 1, 4, 2, 4, 1, 4, 3, 4, 1],
        [3, 4, 1, 2, 3],
        [4, 3, 2, 4, 3],
      ],
      g: [
        [1, 3, 4, 1, 2, 2, 4, 3, 2, 1, 4, 3, 2, 1, 4],
        [1, 4, 3, 2, 1],
        [2, 3, 1, 4, 2],
        [1, 4, 3, 4],
        [3, 2, 4, 1],
        [4, 1],
      ],
      l: [
        [4, 2, 3, 4, 1, 3, 4, 2],
        [4, 3, 2, 3, 3, 1, 2],
        [1, 3, 2, 3, 3],
        [2, 3, 1, 3, 1, 3, 2, 1],
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

for (const entry of TESTS) {
  const { id, title, counts, answers } = entry;
  const voiced = "voiced" in entry;
  test(`the N4 test ${id} is whole, in order, with its listening`, async () => {
    const lesson = lessonDraftSchema.parse(
      JSON.parse(await readFile(`content/jlpt/tests/${id}.json`, "utf8")),
    );
    const questions = lesson.content.questions;
    questions.forEach((question) => parseAssignableQuestion(question));
    assert.deepEqual(countJlptSections(questions), counts);
    // The exam's time is the official minutes of the sections the test has.
    assert.equal(jlptExamMinutes("N4", counts), counts.listening ? 115 : 80);
    const printed = findJlptExamSet(id);
    assert.ok(printed, `${id} is printable`);
    assert.equal(
      describeExamTime(printed).startsWith(counts.listening ? "115 phút" : "80 phút"),
      true,
    );
    assert.equal(describeExamTime(printed).includes("聴解"), counts.listening > 0);
    assert.ok(isOfficialTest(questions));
    assert.equal(officialTestLevel(questions), "N4");
    assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
    assert.deepEqual(
      [...new Set(questions.map((question) => jlptSectionOf(question)))],
      ["vocabulary", "grammarReading", ...(counts.listening ? ["listening"] : [])],
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
      const path = `public/audio/lessons/${question.audio}.mp3`;
      assert.ok(question.audio && (await exists(path)), `${question.id} audio file`);
      const row = BUNDLED_LISTENING_AUDIO.get(question.audio);
      if (voiced) {
        // Read by the synthetic voices of a bundled set, registered with that set's config.
        assert.ok(row && row.voice !== RECORDED_AUDIO_VOICE, `${question.id} voiced audio`);
      } else {
        // A clip of the test's own recording is named by its content and registered as one.
        assert.equal(recordedAudioHash(await readFile(path)), question.audio, question.id);
        assert.equal(row?.voice, RECORDED_AUDIO_VOICE);
      }
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
    assert.equal(source.setId, id);
    assert.equal(examTitleFor(source, 0), title);
  });
}
