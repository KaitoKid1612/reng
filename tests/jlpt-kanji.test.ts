import assert from "node:assert/strict";
import { test } from "node:test";

import {
  collectPaperKanji,
  kanjiIn,
  lookalikeForms,
  parseKanjiLevel,
  practiceWordsOf,
} from "@/lib/jlpt-kanji";
import { KANJI_LEVEL_DATA, lowerLevelKanji } from "@/lib/kanji-data";
import { paperWordsOf } from "@/lib/kanji-paper";

import type { KanjiLevel } from "@/lib/jlpt-kanji";

const LEVELS: KanjiLevel[] = ["n5", "n4"];

const item = (kanji: string, words: string[]) => ({
  kanji,
  group: "g",
  hanViet: "Thử",
  meaning: "thử",
  on: ["テスト"],
  kun: [],
  words: words.map((written) => ({ written, reading: "てすと", meaning: "thử" })),
  tip: "Một mẹo nhớ đủ dài.",
});
const level = (items: unknown[]) => ({ level: "n4", groups: [{ id: "g", title: "Nhóm" }], items });

test("every kanji the official sample papers asked about is in its level or a lower one", () => {
  for (const name of LEVELS) {
    const known = new Set([
      ...lowerLevelKanji(name),
      ...KANJI_LEVEL_DATA[name].items.map((entry) => entry.kanji),
    ]);
    const missing = [...paperWordsOf(name).keys()].filter((kanji) => !known.has(kanji));
    assert.deepEqual(missing, [], `${name} papers ask about kanji outside the list`);
  }
});

test("the paper marks equal the official papers (npm run kanji:paper rewrites them)", () => {
  for (const name of LEVELS) {
    const words = paperWordsOf(name);
    for (const entry of KANJI_LEVEL_DATA[name].items) {
      assert.deepEqual(entry.paper ?? [], words.get(entry.kanji) ?? [], `${name} ${entry.kanji}`);
    }
  }
});

test("words use only kanji of their level or lower, and each level has its group order", () => {
  const n5 = KANJI_LEVEL_DATA.n5;
  assert.ok(n5.items.length >= 100);
  assert.ok(KANJI_LEVEL_DATA.n4.items.length >= 150);
  for (const entry of n5.items) {
    for (const word of entry.words) {
      for (const kanji of kanjiIn(word.written)) {
        assert.ok(
          n5.items.some((other) => other.kanji === kanji),
          `${word.written} in N5 uses ${kanji}`,
        );
      }
    }
  }
  for (const name of LEVELS) {
    const order = KANJI_LEVEL_DATA[name].groups.map((group) => group.id);
    const seen = KANJI_LEVEL_DATA[name].items.map((entry) => order.indexOf(entry.group));
    assert.deepEqual(
      seen,
      seen.toSorted((a, b) => a - b),
      `${name} items follow the group order`,
    );
  }
});

test("a level rejects higher-level kanji, repeats of a lower level and words without the kanji", () => {
  assert.throws(() => parseKanjiLevel(level([item("休", ["休憩"])]), new Set()), /higher level/);
  assert.throws(
    () => parseKanjiLevel(level([item("休", ["休み"])]), new Set(["休"])),
    /lower level/,
  );
  assert.throws(
    () => parseKanjiLevel(level([item("休", ["木"])]), new Set(["木"])),
    /does not use/,
  );
  assert.throws(
    () => parseKanjiLevel(level([item("休", ["休み"]), item("休", ["休む"])])),
    /Duplicate kanji/,
  );
  assert.throws(
    () => parseKanjiLevel(level([{ ...item("休", ["休み"]), kun: ["やすむ)"] }])),
    /kun/,
  );
  const parsed = parseKanjiLevel(level([item("休", ["休み", "木休"])]), new Set(["木"]));
  assert.equal(parsed.items.length, 1);
});

test("the papers' kanji parts give the word asked about to each of its kanji", () => {
  const marks = collectPaperKanji(
    [
      { prompt: "[[先週]] いきました。", tags: ["文字・語彙", "mondai:1"] },
      {
        prompt: "[[かわ]]が",
        options: ["花", "川"],
        answer: [1],
        tags: ["文字・語彙", "mondai:2"],
      },
      { prompt: "[[先週]]", tags: ["文法", "mondai:1"] },
      { prompt: "[[先生]]", tags: ["文字・語彙", "mondai:3"] },
    ],
    2012,
  );
  assert.deepEqual(Object.fromEntries(marks), {
    先: [{ year: 2012, word: "先週" }],
    週: [{ year: 2012, word: "先週" }],
    川: [{ year: 2012, word: "川" }],
  });
});

test("practice lists each word once, for one group or the whole level", () => {
  const n5 = KANJI_LEVEL_DATA.n5;
  const all = practiceWordsOf(n5);
  assert.equal(new Set(all.map((word) => word.written)).size, all.length);
  assert.equal(new Set(all.map((word) => word.id)).size, all.length);
  assert.ok(all.some((word) => word.written === "学校"));
  const body = practiceWordsOf(n5, "body");
  assert.ok(body.length >= 4);
  assert.ok(body.every((word) => word.lang === "ja"));
  assert.ok(body.length < all.length);
});

test("look-alike forms swap one kanji, then two, like the exam's wrong options", () => {
  const lookalikes = new Map([
    ["学", ["宇"]],
    ["校", ["枚"]],
  ]);
  assert.deepEqual(lookalikeForms("学校", lookalikes), ["宇校", "学枚", "宇枚"]);
  assert.deepEqual(lookalikeForms("学校", lookalikes, 2), ["宇校", "学枚"]);
  assert.deepEqual(lookalikeForms("本", lookalikes), []);
  for (const name of LEVELS) {
    for (const entry of KANJI_LEVEL_DATA[name].items) {
      for (const lookalike of entry.lookalikes ?? []) {
        assert.ok(
          lookalike.note.startsWith(lookalike.kanji),
          `${entry.kanji}: the note names ${lookalike.kanji} first`,
        );
      }
    }
  }
});
