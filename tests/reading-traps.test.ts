import assert from "node:assert/strict";
import { test } from "node:test";

import { createKanjiSession } from "@/lib/kanji-practice";
import { buildReadingTraps } from "@/lib/reading-traps";

import type { KanjiWord } from "@/lib/kanji-practice";

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

test("reading traps cross two exam-style changes, like the official 不便 options", () => {
  // Official N4 2018: ふべん, ぶべん, ふへん, ぶへん.
  assert.deepEqual(buildReadingTraps("ふべん", 3, seeded(1)).toSorted(), [
    "ふへん",
    "ぶへん",
    "ぶべん",
  ]);
  for (const reading of ["せんしゅう", "ちいさい", "がっこう", "ろっぴゃく", "きょう"]) {
    const traps = buildReadingTraps(reading, 3, seeded(7));
    assert.equal(traps.length, 3, reading);
    assert.equal(new Set(traps).size, 3, reading);
    assert.ok(!traps.includes(reading), reading);
    assert.ok(
      traps.every((trap) => /^[ぁ-ゖ]+$/u.test(trap) && !trap.startsWith("っ")),
      reading,
    );
  }
});

test("traps keep to changes a reading could really have", () => {
  for (let seed = 1; seed < 40; seed++) {
    // A p sound only after っ or ん, no long vowel before ん.
    assert.ok(
      !buildReadingTraps("たべる", 3, seeded(seed)).some((trap) => /[ぱぴぷぺぽ]/u.test(trap)),
    );
    assert.ok(!buildReadingTraps("にほん", 3, seeded(seed)).includes("にほうん"));
  }
  assert.ok(buildReadingTraps("がっこう", 9, seeded(3)).includes("がこう"));
  assert.ok(buildReadingTraps("せんしゅう", 9, seeded(3)).includes("せんしゅ"));
  // Pinyin and katakana words get none, so other words' readings are used instead.
  assert.deepEqual(buildReadingTraps("nǐhǎo"), []);
  assert.deepEqual(buildReadingTraps("テレビ"), []);
});

test("a reading-choice question offers traps first and look-alike forms for the kanji", () => {
  const words: KanjiWord[] = [
    {
      id: "a",
      written: "学校",
      reading: "がっこう",
      meaning: "trường học",
      lang: "ja",
      writtenDistractors: ["宇校", "学枚", "宇枚"],
    },
    { id: "b", written: "先生", reading: "せんせい", meaning: "thầy cô", lang: "ja" },
  ];
  const [choice] = createKanjiSession([words[0]], ["readingChoice"], 1, seeded(2));
  assert.equal(choice.kind, "readingChoice");
  assert.equal(choice.options.length, 4);
  assert.equal(choice.options[choice.answerIndex], "がっこう");
  assert.ok(!choice.options.includes("せんせい"));
  const [written] = createKanjiSession([words[0]], ["written"], 1, seeded(2));
  assert.deepEqual(written.options.toSorted(), ["学枚", "学校", "宇枚", "宇校"].toSorted());
  // Pinyin readings fall back to other words' readings.
  const zh: KanjiWord[] = [
    { id: "c", written: "你好", reading: "nǐhǎo", meaning: "xin chào", lang: "zh-Hans" },
    { id: "d", written: "老师", reading: "lǎoshī", meaning: "thầy giáo", lang: "zh-Hans" },
  ];
  const [pinyin] = createKanjiSession(zh, ["readingChoice"], 1, seeded(4));
  assert.equal(pinyin.options.length, 2);
});
