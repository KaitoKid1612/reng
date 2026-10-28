import { testQuestionInputSchema, toTestQuestions } from "@/lib/assignment";

import type { InputMode, TestQuestionInput } from "@/lib/assignment";

export type TestQuestionDraft =
  | {
      key: number;
      type: "choice";
      prompt: string;
      options: string[];
      answer: number[];
      multiple: boolean;
      explain: string;
      points: number;
    }
  | {
      key: number;
      type: "fill";
      prompt: string;
      acceptedText: string;
      inputMode: InputMode;
      kanjiStrict: boolean;
      explain: string;
      points: number;
    };

export function createQuestionDraft(key: number, type: "choice" | "fill"): TestQuestionDraft {
  if (type === "choice") {
    return {
      key,
      type,
      prompt: "",
      options: ["", ""],
      answer: [],
      multiple: false,
      explain: "",
      points: 1,
    };
  }
  return {
    key,
    type,
    prompt: "",
    acceptedText: "",
    inputMode: "hiragana",
    kanjiStrict: false,
    explain: "",
    points: 1,
  };
}

export function toTestQuestionInput(draft: TestQuestionDraft): TestQuestionInput {
  if (draft.type === "choice") {
    return {
      type: "choice",
      prompt: draft.prompt.trim(),
      options: draft.options.map((option) => option.trim()),
      answer: draft.answer,
      multiple: draft.multiple,
      explain: draft.explain.trim(),
      points: draft.points,
    };
  }
  return {
    type: "fill",
    prompt: draft.prompt.trim(),
    // One accepted answer per line; kana/kanji equivalents must each be listed (docs/07).
    answer: draft.acceptedText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    inputMode: draft.inputMode,
    kanjiStrict: draft.kanjiStrict,
    explain: draft.explain.trim(),
    points: draft.points,
  };
}

// Teacher-facing explanation of the first problem in a private test question.
export function describeQuestionProblem(draft: TestQuestionDraft) {
  const input = toTestQuestionInput(draft);
  if (!input.prompt) {
    return "Nhập đề bài.";
  }
  if (!input.explain) {
    return "Nhập giải thích đáp án.";
  }
  if (!Number.isInteger(input.points) || input.points < 1 || input.points > 100) {
    return "Điểm là số nguyên từ 1 đến 100.";
  }
  if (input.type === "choice") {
    if (input.options.length < 2 || input.options.some((option) => !option)) {
      return "Cần ít nhất 2 lựa chọn và không để trống lựa chọn nào.";
    }
    if (!input.answer.length) {
      return "Chọn ít nhất một đáp án đúng.";
    }
    if (!input.multiple && input.answer.length !== 1) {
      return "Câu một đáp án chỉ được đánh dấu một lựa chọn đúng.";
    }
  } else {
    if (!input.answer.length) {
      return "Nhập ít nhất một đáp án được chấp nhận.";
    }
    if (input.kanjiStrict && !input.answer.every((answer) => /\p{Script=Han}/u.test(answer))) {
      return "Đã bật kanji bắt buộc nên mọi đáp án phải chứa kanji.";
    }
  }
  if (!testQuestionInputSchema.safeParse(input).success) {
    return "Kiểm tra lại độ dài đề, lựa chọn và đáp án.";
  }
  try {
    toTestQuestions([input]);
  } catch {
    return "Câu hỏi chưa hợp lệ. Kiểm tra lại đáp án.";
  }
  return null;
}
