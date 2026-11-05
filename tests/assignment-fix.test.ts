import assert from "node:assert/strict";
import { test } from "node:test";

import { applyDisplayFix, describeDisplayFixProblem, toDisplayFix } from "../lib/assignment-fix";
import { tidyFurigana } from "../lib/japanese-text";

// Question 9 of the 05/11/2026 daily set, as reported: the learner cannot read 雑誌 yet.
const question9 = {
  id: "r123-q9",
  type: "fill",
  prompt: "「雑誌が 一冊 あります。」一冊の読みをひらがなで書く。",
  inputMode: "hiragana",
  kanjiStrict: false,
  answer: ["いっさつ"],
  explain: "一冊: một quyển.",
  points: 1,
  tags: ["kanji"],
};

const choice = {
  id: "q-choice",
  type: "choice",
  prompt: "昨日、学校へ（　）。",
  options: ["行きました", "来ました"],
  multiple: false,
  answer: [0],
  explain: "行きます: đi.",
  points: 1,
  tags: [],
};

const order = {
  id: "q-order",
  type: "order",
  prompt: "Sắp xếp thành câu đúng.",
  tokens: [
    { id: "a", text: "学校へ" },
    { id: "b", text: "行きます" },
  ],
  answer: ["a", "b"],
  explain: "Nơi chốn + へ + 行きます.",
  points: 1,
  tags: [],
};

const fixOf = (snapshot: Record<string, unknown>) => toDisplayFix(snapshot);

test("the reported question 9 can be rewritten without touching its answer", () => {
  const after = applyDisplayFix(question9, {
    ...fixOf(question9),
    prompt: "「ざっしが 一冊 あります。」\nViết cách đọc Hiragana của 一冊.",
  });
  assert.equal(describeDisplayFixProblem(question9, after), null);
  assert.deepEqual(after.answer, ["いっさつ"]);
  // Furigana over the word being asked would give the answer away.
  const leaking = applyDisplayFix(question9, {
    ...fixOf(question9),
    prompt: "「ざっしが {一冊|いっさつ} あります。」 Viết cách đọc Hiragana của 一冊.",
  });
  assert.match(describeDisplayFixProblem(question9, leaking) ?? "", /^Furigana: câu luyện kanji/);
});

test("options and order pieces only gain furigana; answers and order never move", () => {
  const withFurigana = applyDisplayFix(choice, {
    ...fixOf(choice),
    prompt: "{昨日|きのう}、{学校|がっこう}へ（　）。",
    options: ["{ 行 | い }きました", "来ました"],
  });
  assert.equal(describeDisplayFixProblem(choice, withFurigana), null);
  // Marks are stored tidy so the database strips them the same way.
  assert.deepEqual(withFurigana.options, ["{行|い}きました", "来ました"]);
  const reworded = applyDisplayFix(choice, { ...fixOf(choice), options: ["行きます", "来ました"] });
  assert.match(describeDisplayFixProblem(choice, reworded) ?? "", /chỉ được thêm hoặc bỏ furigana/);
  assert.match(
    describeDisplayFixProblem(choice, { ...choice, answer: [1] }) ?? "",
    /đáp án, lựa chọn và thứ tự câu giữ nguyên/,
  );

  const pieces = applyDisplayFix(order, {
    ...fixOf(order),
    tokens: ["{学校|がっこう}へ", "行きます"],
  });
  assert.equal(describeDisplayFixProblem(order, pieces), null);
  const renamed = applyDisplayFix(order, { ...fixOf(order), tokens: ["学校に", "行きます"] });
  assert.match(describeDisplayFixProblem(order, renamed) ?? "", /chỉ được thêm hoặc bỏ furigana/);
});

test("a fix keeps untouched text exactly and refuses a blank prompt", () => {
  const same = applyDisplayFix(choice, fixOf(choice));
  assert.deepEqual(same, choice);
  const blank = applyDisplayFix(choice, { ...fixOf(choice), prompt: "   " });
  assert.match(describeDisplayFixProblem(choice, blank) ?? "", /không được để trống/);
  assert.equal(
    tidyFurigana("{ 行 | い }きました、{学校|がっこう}"),
    "{行|い}きました、{学校|がっこう}",
  );
});
