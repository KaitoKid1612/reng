import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";

import { parseAssignableQuestion } from "../lib/assignment";
import { BUNDLED_LISTENING_AUDIO } from "../lib/bundled-listening";
import { toSpeechText } from "../lib/japanese-text";
import {
  composeJlptExam,
  countJlptSections,
  isOfficialTest,
  jlptSectionOf,
  officialTestLevel,
} from "../lib/jlpt";
import { JLPT_OFFICIAL_CREDIT, officialAudioUrl } from "../lib/jlpt-official";
import { findFuriganaProblems } from "../lib/lesson-draft";
import { lessonDraftSchema } from "../lib/lesson-schema";
import { splitSpeakerTurns } from "../lib/listening-dialogue";
import { findListeningAudio, parseListeningSet } from "../lib/listening-set";

// The answer keys (正答表) of 公式問題集 第二集 on jlpt.jp, as the printed option numbers 1–4, by
// section (V 文字・語彙, G 文法・読解, L 聴解) and もんだい.
const ANSWER_KEYS = {
  N5: {
    V: [
      [4, 1, 3, 1, 3, 4, 1, 4, 2, 3, 2, 2],
      [4, 3, 2, 1, 1, 4, 3, 2],
      [4, 4, 3, 1, 2, 1, 2, 3, 4, 1],
      [2, 1, 3, 2, 4],
    ],
    G: [
      [2, 4, 1, 4, 2, 3, 1, 3, 1, 2, 4, 3, 2, 4, 3, 1],
      [4, 2, 3, 2, 1],
      [2, 1, 4, 3, 3],
      [3, 2, 1],
      [2, 3],
      [4],
    ],
    L: [
      [3, 1, 4, 2, 1, 4, 3],
      [4, 1, 3, 1, 2, 2],
      [3, 3, 1, 2, 2],
      [1, 3, 3, 2, 1, 2],
    ],
  },
  N4: {
    V: [
      [3, 4, 1, 2, 4, 3, 4, 2, 1],
      [2, 3, 4, 1, 3, 4],
      [1, 2, 2, 3, 2, 1, 4, 3, 4, 1],
      [2, 2, 4, 1, 3],
      [3, 1, 3, 2, 4],
    ],
    G: [
      [3, 4, 2, 1, 4, 1, 3, 4, 2, 4, 3, 2, 3, 1, 2],
      [1, 2, 3, 1, 4],
      [3, 1, 4, 2, 3],
      [4, 2, 3, 4],
      [3, 1, 2, 3],
      [4, 1],
    ],
    L: [
      [1, 3, 2, 4, 3, 3, 3, 1],
      [1, 2, 4, 2, 2, 4, 3],
      [2, 2, 1, 3, 2],
      [1, 3, 3, 1, 2, 3, 2, 1],
    ],
  },
} as const;

const SECTION_COUNTS = {
  N5: { vocabulary: 35, grammarReading: 32, listening: 24 },
  N4: { vocabulary: 35, grammarReading: 35, listening: 28 },
};

async function exists(path: string) {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

for (const level of ["N5", "N4"] as const) {
  const lower = level.toLowerCase();

  test(`the ${level} official test (公式問題集 第二集) matches the workbook`, async () => {
    const lesson = lessonDraftSchema.parse(
      JSON.parse(await readFile(`content/jlpt/official/${lower}-2018.json`, "utf8")),
    );
    const questions = lesson.content.questions;
    questions.forEach((question) => parseAssignableQuestion(question));
    assert.deepEqual(countJlptSections(questions), SECTION_COUNTS[level]);
    assert.ok(isOfficialTest(questions));
    assert.equal(officialTestLevel(questions), level);
    assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);

    // Every answer is the workbook's, in the booklet's order.
    const printed = (prefix: string) =>
      questions
        .filter((question) => question.id.startsWith(prefix))
        .map((question) => (question.answer as number[]).map((index) => index + 1));
    const key = ANSWER_KEYS[level];
    assert.deepEqual(
      printed(`${lower}-2018-v-`),
      key.V.flat().map((answer) => [answer]),
    );
    assert.deepEqual(
      printed(`${lower}-2018-g-`),
      key.G.flat().map((answer) => [answer]),
    );
    key.L.forEach((answers, index) => {
      assert.deepEqual(
        printed(`${lower}-2018-l-${index + 1}-`),
        answers.map((answer) => [answer]),
        `listening もんだい${index + 1}`,
      );
    });
    // Sections come in the booklet's order: 文字・語彙, 文法・読解, then 聴解 parts 1–4.
    const sections = questions.map((question) => jlptSectionOf(question));
    assert.deepEqual(
      [...new Set(sections)],
      ["vocabulary", "grammarReading", "listening"],
      "sections in order",
    );

    for (const question of questions) {
      assert.equal(question.source?.credit, JLPT_OFFICIAL_CREDIT, question.id);
      assert.ok(question.instruction, `${question.id} has its もんだい heading`);
      assert.ok(question.tags.includes("official:jlpt-2018"), question.id);
      if (question.image) {
        assert.ok(await exists(`public${question.image}`), `${question.id} image`);
      }
      if (question.type === "listen") {
        const part = Number(
          question.tags.find((tag) => tag.startsWith("section:"))?.slice("section:".length),
        );
        assert.equal(question.source?.audioUrl, officialAudioUrl(2018, level, part), question.id);
        assert.ok(question.audio && BUNDLED_LISTENING_AUDIO.has(question.audio), question.id);
        assert.ok(await exists(`public/audio/lessons/${question.audio}.mp3`), question.id);
        // The synthetic voice reads the kana of every kanji, so none may be left without one.
        const turns = splitSpeakerTurns(question.transcript) ?? [];
        assert.ok(turns.length > 1, `${question.id} is a labelled script`);
        for (const turn of turns) {
          assert.ok(["ナレーター", "女", "男"].includes(turn.speaker), `${question.id} speaker`);
          assert.doesNotMatch(toSpeechText(turn.text), /\p{Script=Han}/u, `${question.id} reading`);
        }
        if (part >= 3) {
          assert.deepEqual(question.options, ["1", "2", "3"], question.id);
        }
      }
    }
    // A reading passage's questions sit together.
    const passages = questions.map((question) => question.passage ?? null);
    for (const passage of new Set(passages.filter(Boolean))) {
      const first = passages.indexOf(passage);
      const last = passages.lastIndexOf(passage);
      assert.ok(
        passages.slice(first, last + 1).every((item) => item === passage),
        "passage questions are contiguous",
      );
    }
    assert.deepEqual(findFuriganaProblems(questions), []);

    // The exam takes the whole test, in order.
    const exam = composeJlptExam(
      questions.map((question) => ({
        id: question.id,
        type: question.type,
        tags: question.tags,
        passage: question.passage ?? null,
      })),
      [],
      level,
      `official:${level}`,
    );
    assert.deepEqual(
      exam.questionIds,
      questions.map((question) => question.id),
    );
    assert.deepEqual(exam.counts, SECTION_COUNTS[level]);

    // The listening questions are those of the bundled set whose audio was generated.
    const set = parseListeningSet(
      JSON.parse(await readFile(`content/listening/jlpt-official-${lower}-2018.json`, "utf8")),
    );
    const audit = findListeningAudio(set);
    assert.deepEqual([audit.missing, audit.stale], [[], []], "the set's audio is current");
    assert.deepEqual(
      questions.filter((question) => question.type === "listen"),
      set.content.questions,
    );
  });
}
