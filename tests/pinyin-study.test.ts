import assert from "node:assert/strict";
import { test } from "node:test";

import { convertPinyinBeforeCaret } from "../lib/pinyin-input";
import {
  isPinyinCorrect,
  normalizePinyin,
  pickPinyinSession,
  PINYIN_SESSION_SIZE,
  PINYIN_WORDS,
} from "../lib/pinyin-study";

const MARKS: Record<string, [string, number]> = {};
for (const [base, marked] of Object.entries({
  a: "āáǎà",
  e: "ēéěè",
  i: "īíǐì",
  o: "ōóǒò",
  u: "ūúǔù",
  ü: "ǖǘǚǜ",
})) {
  [...marked].forEach((character, index) => {
    MARKS[character] = [base, index + 1];
  });
}

// What a learner types on a phone keyboard: plain letters, v for ü, the tone number last.
function toToneNumbers(syllable: string) {
  let tone = 0;
  const letters = [...syllable.toLowerCase()]
    .map((character) => {
      const mark = MARKS[character];
      if (mark) {
        tone = mark[1];
        return mark[0];
      }
      return character;
    })
    .join("")
    .replace(/ü/g, "v");
  return tone ? `${letters}${tone}` : letters;
}

function typeIntoDrill(keys: string) {
  let value = "";
  for (const key of keys) {
    value = convertPinyinBeforeCaret(value + key, value.length + 1).value;
  }
  return value;
}

test("spaces, capitals and v for ü do not change a pinyin answer", () => {
  assert.equal(normalizePinyin("Nǐ Hǎo"), "nǐhǎo");
  assert.equal(normalizePinyin("nv"), "nü");
  const nihao = PINYIN_WORDS.find((word) => word.id === "nihao");
  assert.ok(nihao);
  assert.equal(isPinyinCorrect("nǐhǎo", nihao), true);
  assert.equal(isPinyinCorrect("ní hǎo", nihao), false);
  assert.equal(isPinyinCorrect("ni hao", nihao), false);
});

test("words read neutral accept the full tone too, but a wrong tone is still wrong", () => {
  const xuesheng = PINYIN_WORDS.find((word) => word.id === "xuesheng");
  assert.ok(xuesheng);
  assert.equal(isPinyinCorrect("xuésheng", xuesheng), true);
  assert.equal(isPinyinCorrect("xuéshēng", xuesheng), true);
  assert.equal(isPinyinCorrect("xuèshēng", xuesheng), false);
});

test("every drill word has one syllable per character and can be typed with tone numbers", () => {
  assert.equal(new Set(PINYIN_WORDS.map((word) => word.id)).size, PINYIN_WORDS.length);
  for (const word of PINYIN_WORDS) {
    const syllables = word.pinyin.split(" ");
    assert.equal(syllables.length, [...word.hanzi].length, word.id);
    assert.match(word.pinyin, /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ ]+$/u, word.id);
    const typed = typeIntoDrill(syllables.map(toToneNumbers).join(" "));
    assert.equal(isPinyinCorrect(typed, word), true, `${word.id}: ${typed}`);
  }
});

test("a session draws distinct words, repeatably for the same random source", () => {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const first = pickPinyinSession(PINYIN_WORDS, PINYIN_SESSION_SIZE, random);
  assert.equal(first.length, PINYIN_SESSION_SIZE);
  assert.equal(new Set(first.map((word) => word.id)).size, PINYIN_SESSION_SIZE);
  seed = 7;
  assert.deepEqual(pickPinyinSession(PINYIN_WORDS, PINYIN_SESSION_SIZE, random), first);
  assert.equal(pickPinyinSession(PINYIN_WORDS.slice(0, 3), PINYIN_SESSION_SIZE, random).length, 3);
});
