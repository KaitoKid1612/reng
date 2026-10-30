import assert from "node:assert/strict";
import { test } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TestQuestionEditor } from "../components/teach/test-question-editor";
import { toTestQuestions } from "../lib/assignment";
import { gradeQuestion } from "../lib/grading/grade";
import { createQuestionDraft, toTestQuestionInput } from "../lib/test-question-draft";

for (const languageTag of ["ja-JP", "zh-Hans", "zh-Hant"] as const) {
  test(`test authoring defaults and instructions follow ${languageTag}`, () => {
    const draft = createQuestionDraft(1, "fill", languageTag);
    assert.ok(draft.type === "fill");
    assert.equal(draft.inputMode, languageTag === "ja-JP" ? "hiragana" : "chinese");
    const html = renderToStaticMarkup(
      createElement(TestQuestionEditor, {
        draft,
        languageTag,
        position: 1,
        showProblems: false,
        onChange: () => undefined,
        onRemove: () => undefined,
      }),
    );
    assert.match(html, languageTag === "ja-JP" ? /kanji và kana/ : /pinyin cần đúng dấu thanh/);
    if (languageTag !== "ja-JP") {
      assert.doesNotMatch(html, /lang="ja"|Bắt buộc viết kanji/);
    }
  });
}

test("Chinese private fill questions keep tones and script distinctions after conversion", () => {
  const draft = createQuestionDraft(1, "fill", "zh-Hant");
  assert.ok(draft.type === "fill");
  const [hanzi] = toTestQuestions(
    [
      toTestQuestionInput({
        ...draft,
        prompt: "Viết lời cảm ơn",
        acceptedText: "謝謝",
        explain: "Viết đúng phồn thể.",
      }),
    ],
    "zh-Hant",
  );
  assert.ok(hanzi);
  assert.equal(gradeQuestion(hanzi, "謝謝").isCorrect, true);
  assert.equal(gradeQuestion(hanzi, "谢谢").isCorrect, false);
  const [pinyin] = toTestQuestions(
    [
      toTestQuestionInput({
        ...draft,
        inputMode: "pinyin",
        prompt: "Viết pinyin",
        acceptedText: "nǐ hǎo",
        explain: "Giữ dấu thanh.",
      }),
    ],
    "zh-Hans",
  );
  assert.ok(pinyin);
  assert.equal(gradeQuestion(pinyin, "nǐ hǎo").isCorrect, true);
  assert.equal(gradeQuestion(pinyin, "ni hao").isCorrect, false);
});
