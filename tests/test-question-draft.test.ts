import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createQuestionDraft,
  describeQuestionProblem,
  toTestQuestionInput,
} from "../lib/test-question-draft";
import { fromVietnamInput, toVietnamInput } from "../lib/vietnam-time";

test("teacher test questions explain the first problem before publishing", () => {
  const choice = createQuestionDraft(1, "choice");
  assert.ok(choice.type === "choice");
  assert.equal(describeQuestionProblem(choice), "Nhập đề bài.");
  const filled = {
    ...choice,
    prompt: "わたし___ がくせいです。",
    options: ["は", "を"],
    explain: "は đánh dấu chủ đề.",
  };
  assert.equal(describeQuestionProblem(filled), "Chọn ít nhất một đáp án đúng.");
  assert.equal(
    describeQuestionProblem({ ...filled, answer: [0, 1] }),
    "Câu một đáp án chỉ được đánh dấu một lựa chọn đúng.",
  );
  assert.equal(describeQuestionProblem({ ...filled, answer: [0] }), null);
  const fillDraft = createQuestionDraft(2, "fill");
  assert.ok(fillDraft.type === "fill");
  const fill = {
    ...fillDraft,
    prompt: "Viết “tôi”",
    explain: "私 đọc là わたし.",
    acceptedText: "私\n わたし \n\n",
    kanjiStrict: true,
  };
  assert.equal(
    describeQuestionProblem(fill),
    "Đã bật kanji bắt buộc nên mọi đáp án phải chứa kanji.",
  );
  const relaxed = { ...fill, kanjiStrict: false };
  assert.equal(describeQuestionProblem(relaxed), null);
  const input = toTestQuestionInput(relaxed);
  assert.deepEqual(input.type === "fill" ? input.answer : [], ["私", "わたし"]);
});

test("datetime inputs use Vietnam time independent of the device time zone", () => {
  assert.equal(toVietnamInput("2026-10-28T13:00:00.000Z"), "2026-10-28T20:00");
  assert.equal(fromVietnamInput("2026-10-28T20:00"), "2026-10-28T13:00:00.000Z");
  assert.equal(fromVietnamInput("not-a-date"), "");
  assert.equal(toVietnamInput(""), "");
});
