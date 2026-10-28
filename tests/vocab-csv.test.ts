import assert from "node:assert/strict";
import { test } from "node:test";

import { decodeCsvFile, MAX_CSV_ROWS, parseDelimited, parseVocabularyCsv } from "../lib/vocab-csv";

test("parses quoted fields, embedded line breaks and Vietnamese header names", () => {
  const csv =
    '﻿JP,Hán tự,Romaji,Nghĩa,Ghi chú\r\nいきます,行きます,ikimasu,"đi, đi đến",\r\nがっこう,学校,gakkou,"trường\nhọc","nói ""gakkō"""\r\nえいが,映画,eiga,phim,\r\n';
  const result = parseVocabularyCsv(csv, []);
  assert.equal(result.error, null);
  assert.deepEqual(
    result.rows.map((row) => [row.line, row.status, row.values.vi]),
    [
      [2, "valid", "đi, đi đến"],
      [3, "valid", "trường\nhọc"],
      [5, "valid", "phim"],
    ],
  );
  assert.equal(result.rows[1].values.note, 'nói "gakkō"');
});

test("accepts tables pasted from Excel and semicolon exports", () => {
  const pasted = "jp\tromaji\tvi\nねこ\tneko\tcon mèo\n";
  assert.equal(parseVocabularyCsv(pasted, [])?.rows[0]?.status, "valid");
  const semicolon = "jp;romaji;vi\nいぬ;inu;con chó\n";
  assert.equal(parseVocabularyCsv(semicolon, []).rows[0].values.vi, "con chó");
  assert.deepEqual(
    parseDelimited("a,b\n\n\nc,d", ",").map((record) => record.line),
    [1, 4],
  );
});

test("reports problems per line and skips duplicates", () => {
  const csv = [
    "jp,kanji,romaji,vi",
    "学校,,gakkou,trường học",
    "ねこ,,,con mèo",
    "いぬ,犬,inu,con chó",
    "イヌ,,inu,con chó",
    "いぬ,犬,inu,con chó",
    "こんにちは,,konnichiwa,xin chào",
  ].join("\n");
  const rows = parseVocabularyCsv(csv, [{ jp: "こんにちは", vi: "Xin chào" }]).rows;
  assert.deepEqual(
    rows.map((row) => [row.line, row.status]),
    [
      [2, "invalid"],
      [3, "invalid"],
      [4, "valid"],
      [5, "valid"],
      [6, "duplicate"],
      [7, "duplicate"],
    ],
  );
  assert.match(rows[0].problems[0], /kanji đặt ở cột kanji/);
  assert.deepEqual(rows[1].problems, ["thiếu romaji"]);
});

test("rejects missing columns, oversized imports and non UTF-8 files", () => {
  assert.match(parseVocabularyCsv("jp,vi\nねこ,mèo", []).error ?? "", /Thiếu cột romaji/);
  const many = ["jp,romaji,vi", ...Array.from({ length: MAX_CSV_ROWS + 1 }, () => "ねこ,neko,mèo")];
  assert.match(parseVocabularyCsv(many.join("\n"), []).error ?? "", /Tối đa/);
  const windows1258 = Uint8Array.from([0x6a, 0x70, 0x2c, 0x76, 0x69, 0x0a, 0xf0, 0xe8]);
  assert.throws(() => decodeCsvFile(windows1258.buffer));
  assert.equal(decodeCsvFile(new TextEncoder().encode("jp,vi").buffer), "jp,vi");
});
