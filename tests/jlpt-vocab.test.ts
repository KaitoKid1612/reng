import assert from "node:assert/strict";
import { test } from "node:test";

import { blankOf, N4_PAPER_WORDS, parseVocabLevel, withBlank, withWord } from "@/lib/jlpt-vocab";
import { VOCAB_LEVEL_DATA } from "@/lib/vocab-data";
import { createVocabSession } from "@/lib/vocab-practice";

import type { JlptVocab } from "@/lib/jlpt-vocab";

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

const word = (reading: string, pos: JlptVocab["pos"], similar?: string): JlptVocab => ({
  word: reading,
  reading,
  group: "g",
  pos,
  meaning: `nghĩa ${reading}`,
  example: { ja: `きょうは [[${reading}]] です。`, vi: "Hôm nay.", choices: ["あ", "い", "う"] },
  ...(similar ? { similar } : {}),
});

test("the N4 list has every word the official papers asked about, and marks only those", () => {
  const data = VOCAB_LEVEL_DATA.n4;
  for (const [reading, years] of Object.entries(N4_PAPER_WORDS)) {
    const item = data.items.find((entry) => entry.reading === reading);
    assert.ok(item, `${reading} is missing`);
    assert.deepEqual(item.paper, years, reading);
  }
  const marked = data.items.filter((entry) => entry.paper).map((entry) => entry.reading);
  assert.deepEqual(marked.toSorted(), Object.keys(N4_PAPER_WORDS).toSorted());
});

test("an example has one blank, wrong choices apart from the answer and only N5/N4 kanji", () => {
  const level = (item: unknown) => ({
    level: "n4",
    groups: [{ id: "g", title: "G" }],
    items: [item],
  });
  const ok = word("ゆめ", "noun");
  assert.equal(parseVocabLevel(level(ok), new Set()).items.length, 1);
  assert.throws(
    () =>
      parseVocabLevel(level({ ...ok, example: { ...ok.example, ja: "ゆめ です。" } }), new Set()),
    /exactly one/,
  );
  assert.throws(
    () =>
      parseVocabLevel(
        level({ ...ok, example: { ...ok.example, choices: ["ゆめ", "い", "う"] } }),
        new Set(),
      ),
    /repeats the answer/,
  );
  assert.throws(
    () =>
      parseVocabLevel(
        level({ ...ok, example: { ...ok.example, ja: "夢の [[ゆめ]] です。" } }),
        new Set(),
      ),
    /not an N5\/N4 kanji/,
  );
  assert.deepEqual(blankOf("けさ [[ねぼうして]]、"), ["ねぼうして"]);
  assert.equal(withBlank("けさ [[ねぼうして]]、"), "けさ （　　）、");
  assert.equal(withWord("けさ [[ねぼうして]]、"), "けさ ねぼうして、");
});

test("a session asks each word once, in the exam's shapes, falling back when there is no synonym", () => {
  const items = [
    word("しんぱい", "suru-noun", "きに なる"),
    word("そうだん", "suru-noun", "はなしあう"),
    word("ゆめ", "noun"),
    word("きょうみ", "noun", "かんしん"),
    word("せつめい", "suru-noun"),
  ];
  const fill = createVocabSession(items, ["fill"], 10, items, seeded(3));
  assert.equal(fill.length, items.length);
  for (const question of fill) {
    assert.equal(question.options.length, 4);
    assert.match(question.prompt, /（　　）/u);
    assert.equal(question.options[question.answerIndex], question.item.reading);
  }
  const similar = createVocabSession(items, ["similar"], 10, items, seeded(5));
  // Words without a synonym have nothing to ask in this kind alone.
  assert.equal(similar.length, 3);
  for (const question of similar) {
    assert.equal(question.options[question.answerIndex], question.item.similar);
    assert.equal(new Set(question.options).size, 4);
  }
  const mixed = createVocabSession(items, ["similar", "meaning"], 10, items, seeded(7));
  assert.equal(mixed.length, items.length);
  assert.ok(mixed.every((question) => question.kind !== "similar" || question.item.similar));
  assert.equal(createVocabSession(items, ["meaning"], 2, items, seeded(9)).length, 2);
});
