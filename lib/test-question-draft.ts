import { testQuestionInputSchema, toTestQuestions } from "@/lib/assignment";
import {
  describeOrderPiecesProblem,
  describePassageProblem,
  filledPieces,
  toOrderTokens,
} from "@/lib/order-pieces";

import type { InputMode, TestQuestionInput } from "@/lib/assignment";
import type { TeachingLanguageTag } from "@/lib/teaching-language";

// Every question can carry a reading passage; an empty passage means none.
interface DraftBase {
  key: number;
  passage: string;
  prompt: string;
  explain: string;
  points: number;
}

export type TestQuestionDraft =
  | (DraftBase & {
      type: "choice";
      options: string[];
      answer: number[];
      multiple: boolean;
    })
  | (DraftBase & {
      type: "fill";
      acceptedText: string;
      inputMode: InputMode;
      kanjiStrict: boolean;
    })
  // Pieces in sentence order, one per line; learners get them shuffled.
  | (DraftBase & { type: "order"; pieces: string });

export type TestQuestionType = TestQuestionDraft["type"];

export const TEST_QUESTION_TYPE_LABELS: Record<TestQuestionType, string> = {
  choice: "trắc nghiệm",
  fill: "điền từ",
  order: "sắp xếp câu",
};

export function createQuestionDraft(
  key: number,
  type: TestQuestionType,
  languageTag: TeachingLanguageTag = "ja-JP",
  passage = "",
): TestQuestionDraft {
  const base = { key, passage, prompt: "", explain: "", points: 1 };
  switch (type) {
    case "choice":
      return { ...base, type, options: ["", ""], answer: [], multiple: false };
    case "fill":
      return {
        ...base,
        type,
        acceptedText: "",
        inputMode: languageTag === "ja-JP" ? "hiragana" : "chinese",
        kanjiStrict: false,
      };
    case "order":
      return { ...base, type, pieces: "" };
  }
}

export function toTestQuestionInput(draft: TestQuestionDraft): TestQuestionInput {
  const passage = draft.passage.trim();
  const shared = {
    ...(passage ? { passage } : {}),
    prompt: draft.prompt.trim(),
    explain: draft.explain.trim(),
    points: draft.points,
  };
  switch (draft.type) {
    case "choice":
      return {
        type: "choice",
        ...shared,
        options: draft.options.map((option) => option.trim()),
        answer: draft.answer,
        multiple: draft.multiple,
      };
    case "fill":
      return {
        type: "fill",
        ...shared,
        // One accepted answer per line; kana/kanji equivalents must each be listed (docs/07).
        answer: draft.acceptedText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        inputMode: draft.inputMode,
        kanjiStrict: draft.kanjiStrict,
      };
    case "order":
      return {
        type: "order",
        ...shared,
        ...toOrderTokens(filledPieces(draft.pieces.split("\n"))),
      };
  }
}

function toSentence(fragment: string) {
  return fragment.charAt(0).toUpperCase() + fragment.slice(1);
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
  const passageProblem = describePassageProblem(draft.passage);
  if (passageProblem) {
    return toSentence(passageProblem);
  }
  if (input.type === "choice") {
    if (input.options.length < 2 || input.options.some((option) => !option)) {
      return "Cần ít nhất 2 lựa chọn và không để trống lựa chọn nào.";
    }
    if (new Set(input.options.map((option) => option.trim())).size !== input.options.length) {
      return "Có hai lựa chọn giống nhau; sửa để mỗi lựa chọn khác nhau.";
    }
    if (!input.answer.length) {
      return "Chọn ít nhất một đáp án đúng.";
    }
    if (!input.multiple && input.answer.length !== 1) {
      return "Câu một đáp án chỉ được đánh dấu một lựa chọn đúng.";
    }
  } else if (input.type === "fill") {
    if (!input.answer.length) {
      return "Nhập ít nhất một đáp án được chấp nhận.";
    }
    if (input.kanjiStrict && !input.answer.every((answer) => /\p{Script=Han}/u.test(answer))) {
      return "Đã bật kanji bắt buộc nên mọi đáp án phải chứa kanji.";
    }
  } else {
    const piecesProblem = describeOrderPiecesProblem(input.tokens.map((token) => token.text));
    if (piecesProblem) {
      return toSentence(piecesProblem);
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
