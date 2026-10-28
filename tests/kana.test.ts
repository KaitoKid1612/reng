import { test } from "node:test";
import assert from "node:assert/strict";

import rawData from "../content/kana.json";
import {
  kanaSchema,
  isCorrect,
  normalizeRomaji,
  createSession,
  practiceReducer,
  initialPractice,
} from "../lib/kana";

const items = kanaSchema.parse(rawData).items;

function getItem(id: string) {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `Missing kana fixture: ${id}`);
  return item;
}

test("validates 208 kana items and rejects duplicate or mismatched data", () => {
  assert.equal(items.length, 208);
  const duplicate = structuredClone(rawData);
  duplicate.items[1] = duplicate.items[0];
  assert.equal(kanaSchema.safeParse(duplicate).success, false);
  const invalid = structuredClone(rawData);
  invalid.items[0].kana = "ア";
  assert.equal(kanaSchema.safeParse(invalid).success, false);
});
test("accepts declared romaji variants and NFKC casing without removing internal spaces", () => {
  const shi = getItem("h-shi");
  assert.ok(isCorrect(shi, " ＳＨＩ "));
  assert.ok(isCorrect(shi, "si"));
  assert.equal(isCorrect(shi, "s hi"), false);
  assert.equal(isCorrect(shi, "し"), false);
  assert.equal(normalizeRomaji("  N' "), "n'");
  assert.ok(isCorrect(getItem("h-di"), "ji"));
  assert.ok(isCorrect(getItem("h-wo"), "o"));
});
test("creates unique sessions without mutating input or exceeding the available pool", () => {
  const copy = items.map((item) => item.id);
  const session = createSession(items, 20, () => 0.5);
  assert.equal(new Set(session.map((item) => item.id)).size, 20);
  assert.deepEqual(
    items.map((item) => item.id),
    copy,
  );
  assert.equal(createSession(items.slice(0, 5), 20).length, 5);
});
test("ignores blank or duplicate submissions and records each question once", () => {
  let state = practiceReducer(initialPractice, {
    type: "start",
    items: items.slice(0, 2),
  });
  state = practiceReducer(state, { type: "submit", raw: " " });
  assert.equal(state.records.length, 0);
  state = practiceReducer(state, { type: "submit", raw: "a" });
  assert.equal(state.phase, "feedback");
  state = practiceReducer(state, { type: "submit", raw: "wrong" });
  assert.equal(state.records.length, 1);
  assert.equal(state.records[0].correct, true);
  state = practiceReducer(state, { type: "next" });
  assert.equal(state.index, 1);
  state = practiceReducer(state, { type: "submit", raw: "wrong" });
  state = practiceReducer(state, { type: "next" });
  assert.equal(state.phase, "result");
  assert.equal(state.records.length, 2);
  assert.equal(state.records.filter((record) => record.correct).length, 1);
});
