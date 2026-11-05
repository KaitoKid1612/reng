import assert from "node:assert/strict";
import { test } from "node:test";

import {
  carryReadings,
  countUnreadUnits,
  fromFuriganaDraft,
  isKanaReading,
  listReadingUnits,
  toFuriganaDraft,
} from "../lib/furigana-units";
import { stripFuriganaMarks } from "../lib/japanese-text";

test("kanji words are found with the digits written before them", () => {
  assert.deepEqual(
    listReadingUnits("昨日、学校へ行きました。7時に１週間、一冊").map((unit) => unit.text),
    ["昨日", "学校", "行", "7時", "１週間", "一冊"],
  );
  assert.deepEqual(listReadingUnits("わたしは がくせいです。"), []);
});

test("stored furigana becomes one reading per word and goes back unchanged", () => {
  const stored = "{昨日|きのう}、{学校|がっこう}へ{行|い}きました。";
  const draft = toFuriganaDraft(stored);
  assert.deepEqual(draft, {
    text: "昨日、学校へ行きました。",
    readings: ["きのう", "がっこう", "い"],
    unmatched: 0,
  });
  assert.equal(fromFuriganaDraft(draft), stored);
  // Words left without a reading stay plain.
  assert.equal(
    fromFuriganaDraft({ text: "昨日、学校へ行きました。", readings: ["きのう", "", " "] }),
    "{昨日|きのう}、学校へ行きました。",
  );
});

test("a mark over kana and kanji keeps only the kanji's reading, with the same plain text", () => {
  const draft = toFuriganaDraft("{お茶|おちゃ}を{飲|の}みます。");
  assert.deepEqual(draft.readings, ["ちゃ", "の"]);
  assert.equal(draft.unmatched, 0);
  const stored = fromFuriganaDraft(draft);
  assert.equal(stored, "お{茶|ちゃ}を{飲|の}みます。");
  assert.equal(stripFuriganaMarks(stored), stripFuriganaMarks("{お茶|おちゃ}を{飲|の}みます。"));
  // Two kanji words under one mark cannot be split safely; the teacher is told.
  assert.equal(toFuriganaDraft("{行き来|いきき}").unmatched, 1);
  // Words marked one by one inside a longer kanji run keep their readings, joined.
  const joined = toFuriganaDraft("{毎週|まいしゅう}{土曜日|どようび}に");
  assert.deepEqual(joined, {
    text: "毎週土曜日に",
    readings: ["まいしゅうどようび"],
    unmatched: 0,
  });
  assert.equal(fromFuriganaDraft(joined), "{毎週土曜日|まいしゅうどようび}に");
  // Half a run marked cannot become one reading; the teacher is told instead of losing it quietly.
  assert.equal(toFuriganaDraft("{毎週|まいしゅう}土曜日").unmatched, 1);
});

test("readings follow their words while the teacher edits the text", () => {
  const previous = { text: "学校へ行きました。", readings: ["がっこう", "い"] };
  assert.deepEqual(carryReadings(previous, "昨日、学校へ行きました。"), ["", "がっこう", "い"]);
  // Both 学校 start with the known reading; new words start empty.
  assert.deepEqual(carryReadings(previous, "学校の前で学校の友達に会いました。"), [
    "がっこう",
    "",
    "がっこう",
    "",
    "",
  ]);
  assert.equal(countUnreadUnits("{昨日|きのう}、学校へ行きました。"), 2);
  assert.equal(isKanaReading("きのう"), true);
  assert.equal(isKanaReading("kinou"), false);
});
