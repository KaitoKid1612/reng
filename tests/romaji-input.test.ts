import assert from "node:assert/strict";
import { test } from "node:test";

import {
  convertRomajiBeforeCaret,
  finalizeRomaji,
  isJapaneseComposition,
} from "../lib/romaji-input";

test("converts the romaji being typed and keeps an unfinished n or consonant", () => {
  assert.deepEqual(convertRomajiBeforeCaret("ko", 2, "hiragana"), { value: "こ", caret: 1 });
  assert.equal(convertRomajiBeforeCaret("kon", 3, "hiragana").value, "こn");
  assert.equal(convertRomajiBeforeCaret("konn", 4, "hiragana").value, "こん");
  assert.equal(convertRomajiBeforeCaret("k", 1, "hiragana").value, "k");
  assert.equal(convertRomajiBeforeCaret("gakkou", 6, "hiragana").value, "がっこう");
  assert.equal(convertRomajiBeforeCaret("ikimasu", 7, "katakana").value, "イキマス");
  assert.equal(convertRomajiBeforeCaret("ra-men", 6, "katakana").value, "ラーメn");
});

test("leaves pasted kanji and text after the caret unchanged", () => {
  assert.deepEqual(convertRomajiBeforeCaret("行きmasu", 6, "japanese"), {
    value: "行きます",
    caret: 4,
  });
  assert.deepEqual(convertRomajiBeforeCaret("わtaし", 3, "hiragana"), {
    value: "わたし",
    caret: 2,
  });
  assert.deepEqual(convertRomajiBeforeCaret("私は", 2, "japanese"), { value: "私は", caret: 2 });
});

test("leaving the field completes a pending final n without rewriting entered kana", () => {
  assert.equal(finalizeRomaji("よにn", "hiragana"), "よにん");
  assert.equal(finalizeRomaji("ラーメn", "katakana"), "ラーメン");
  assert.equal(finalizeRomaji("行きます", "japanese"), "行きます");
  assert.equal(finalizeRomaji("こnにちは", "hiragana"), "こんにちは");
  assert.equal(finalizeRomaji("k", "hiragana"), "k");
  assert.equal(finalizeRomaji("nǐ hǎo", "pinyin"), "nǐ hǎo");
});

test("skips only Japanese IME composition", () => {
  assert.equal(isJapaneseComposition(true, "か"), true);
  assert.equal(isJapaneseComposition(true, "ka"), false);
  assert.equal(isJapaneseComposition(false, "か"), false);
});

test("Vietnamese text input is never converted to kana", () => {
  assert.deepEqual(convertRomajiBeforeCaret("thu hai", 7, "text"), { value: "thu hai", caret: 7 });
  assert.equal(finalizeRomaji("ban", "text"), "ban");
});
