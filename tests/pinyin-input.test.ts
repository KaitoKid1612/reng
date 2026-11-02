import assert from "node:assert/strict";
import { test } from "node:test";

import { addToneMark, convertPinyinBeforeCaret } from "../lib/pinyin-input";

test("tone numbers place the mark on the vowel pinyin rules choose", () => {
  const cases: [string, number, string][] = [
    ["ni", 3, "nǐ"],
    ["hao", 3, "hǎo"],
    ["xie", 4, "xiè"],
    ["zhuang", 4, "zhuàng"],
    ["gui", 4, "guì"],
    ["liu", 2, "liú"],
    ["you", 3, "yǒu"],
    ["jiong", 3, "jiǒng"],
    ["lv", 4, "lǜ"],
    ["nüe", 4, "nüè"],
    ["Ma", 1, "Mā"],
    ["er", 4, "èr"],
  ];
  for (const [letters, tone, expected] of cases) {
    assert.equal(addToneMark(letters, tone), expected, `${letters}${tone}`);
  }
  assert.equal(addToneMark("ma", 5), "ma");
  assert.equal(addToneMark("lv", 0), "lü");
  assert.equal(addToneMark("ng", 2), null);
});

test("typing a tone number converts only the syllable before the caret", () => {
  assert.deepEqual(convertPinyinBeforeCaret("ni3", 3), { value: "nǐ", caret: 2 });
  assert.deepEqual(convertPinyinBeforeCaret("nǐ hao3", 7), { value: "nǐ hǎo", caret: 6 });
  // A two-syllable run takes the tone on its last syllable, as typed.
  assert.deepEqual(convertPinyinBeforeCaret("xiexie4", 7), { value: "xiexiè", caret: 6 });
  // Text after the caret and numbers without a syllable stay untouched.
  assert.deepEqual(convertPinyinBeforeCaret("ni3 hao", 3), { value: "nǐ hao", caret: 2 });
  assert.deepEqual(convertPinyinBeforeCaret("3", 1), { value: "3", caret: 1 });
  assert.deepEqual(convertPinyinBeforeCaret("ng2", 3), { value: "ng2", caret: 3 });
  assert.deepEqual(convertPinyinBeforeCaret("ni8", 3), { value: "ni8", caret: 3 });
  // A syllable that already carries a mark keeps it; the extra number stays visible.
  assert.deepEqual(convertPinyinBeforeCaret("hǎo3", 4), { value: "hǎo3", caret: 4 });
  // Syllables typed without spaces each take their own number.
  assert.deepEqual(convertPinyinBeforeCaret("lǎoshi1", 7), { value: "lǎoshī", caret: 6 });
  assert.deepEqual(convertPinyinBeforeCaret("nǐhao3", 6), { value: "nǐhǎo", caret: 5 });
  assert.deepEqual(convertPinyinBeforeCaret("xièxie5", 7), { value: "xièxie", caret: 6 });
});
