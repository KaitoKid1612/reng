import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { parseAssignableQuestion } from "../lib/assignment";
import { gradeQuestion } from "../lib/grading/grade";
import { jlptPartOf } from "../lib/jlpt-parts";
import { findFuriganaProblems } from "../lib/lesson-draft";
import { lessonDraftSchema } from "../lib/lesson-schema";

const BANKS = [
  "n4-daily-with-listening",
  "n4-jlpt-mock-standard",
  "n4-jlpt-mock-advanced",
  "n4-coverage",
] as const;

interface RawQuestion {
  id: string;
  tags?: string[];
  prompt?: string;
  options?: string[];
  answer?: number[];
}

async function questionsOf(name: string): Promise<RawQuestion[]> {
  return JSON.parse(await readFile(`content/review-banks/${name}.json`, "utf8")).content.questions;
}

// The words, kanji and grammar points the N4 banks ask about, written out as one text.
function plain(text: string) {
  return text.replace(/\{([^|{}]+)\|[^{}]+\}/gu, "$1").replace(/\[\[|\]\]/gu, "");
}

test("the N4 coverage bank holds assignable N4 vocabulary, kanji and grammar questions", async () => {
  const raw = JSON.parse(await readFile("content/review-banks/n4-coverage.json", "utf8"));
  const bank = lessonDraftSchema.parse(raw);
  const questions = bank.content.questions;
  assert.ok(questions.length <= 500);
  assert.deepEqual(findFuriganaProblems(questions), []);
  const positions = [0, 0, 0, 0];
  for (const item of questions) {
    const part = jlptPartOf(item);
    assert.ok(part && part.section !== "listening", `${item.id} has a language part`);
    const question = parseAssignableQuestion(item);
    assert.equal(question.type, "choice", item.id);
    assert.equal(question.options.length, 4, item.id);
    assert.equal(question.answer.length, 1, item.id);
    assert.equal(gradeQuestion(question, question.answer).isCorrect, true, item.id);
    positions[question.answer[0]] += 1;
  }
  // The right answer is spread over the four positions, not mostly first.
  assert.ok(Math.max(...positions) - Math.min(...positions) <= questions.length * 0.1);
});

test("the N4 banks share no question id and together ask every N4 word, kanji and grammar point", async () => {
  const all = (await Promise.all(BANKS.map(questionsOf))).flat();
  const ids = all.map((question) => question.id);
  assert.equal(new Set(ids).size, ids.length);

  const vocabularyParts = ["kanji-reading", "orthography", "contextual", "paraphrase", "usage"];
  // Each asked word on its own: the underlined part, the right option, a usage item's word.
  const asked = all
    .filter((question) => vocabularyParts.some((part) => question.tags?.includes(part)))
    .flatMap((question) => [
      ...[...(question.prompt ?? "").matchAll(/\[\[(.+?)\]\]/gu)].map((match) => match[1]),
      question.options?.[question.answer?.[0] ?? -1] ?? "",
      question.tags?.includes("usage") ? (question.prompt ?? "") : "",
    ])
    .map((text) => plain(text).replace(/[\s　]/gu, ""))
    .filter(Boolean);
  const vocabulary = JSON.parse(await readFile("content/vocab/n4.json", "utf8")).items as {
    word: string;
    reading: string;
    pos: string;
  }[];
  const missingWords = vocabulary.filter((item) => {
    const forms = [item.word, item.reading].map((form) => form.replace(/[\s　]/gu, ""));
    // A conjugated verb or adjective keeps its stem, followed by a short ending (かった, にます).
    const stems = ["verb", "i-adjective", "expression"].includes(item.pos)
      ? forms.map((form) => form.slice(0, -1))
      : [];
    return !asked.some(
      (text) =>
        forms.some((form) => text === form || (form.length >= 2 && text.includes(form))) ||
        stems.some((stem) =>
          stem.length >= 2
            ? text.includes(stem)
            : text.startsWith(stem) && text.length - stem.length <= 4,
        ),
    );
  });
  assert.deepEqual(
    missingWords.map((item) => item.word),
    [],
  );

  const kanjiAsked = all
    .filter((question) =>
      ["kanji-reading", "orthography"].some((part) => question.tags?.includes(part)),
    )
    .map((question) => plain(`${question.prompt ?? ""}${(question.options ?? []).join("")}`))
    .join("");
  const kanji = JSON.parse(await readFile("content/kanji/n4.json", "utf8")).items as {
    kanji: string;
  }[];
  assert.deepEqual(
    kanji.filter((item) => !kanjiAsked.includes(item.kanji)).map((item) => item.kanji),
    [],
  );

  const tagged = new Set(
    all.flatMap((question) => (question.tags ?? []).filter((tag) => tag.startsWith("grammar:"))),
  );
  const points = new Set<string>();
  for (let deck = 1; deck <= 8; deck += 1) {
    const text = await readFile(`content/starters/n4-grammar-${deck}.json`, "utf8");
    for (const match of text.matchAll(/"id": "(n4g-[a-z0-9-]+)"/gu)) {
      points.add(match[1]);
    }
  }
  assert.ok(points.size >= 100);
  assert.deepEqual(
    [...points].filter((point) => !tagged.has(`grammar:${point}`)),
    [],
  );
});
