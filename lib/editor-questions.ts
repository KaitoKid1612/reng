import { toOrderPieces, toOrderTokens } from "@/lib/order-pieces";

import type {
  DraftChoiceQuestion,
  DraftFillQuestion,
  DraftOrderQuestion,
  DraftQuestion,
} from "@/lib/lesson-draft";
import type { TeachingLanguageTag } from "@/lib/teaching-language";
import type { TestQuestionDraft } from "@/lib/test-question-draft";

// Practice questions of the web editor that use the shared test question editor.
export type TextQuestion = DraftChoiceQuestion | DraftFillQuestion | DraftOrderQuestion;
export type NewQuestionType = "choice" | "fill" | "order" | "listen" | "dictation";

export const ADD_QUESTION_LABELS: Record<NewQuestionType, string> = {
  choice: "Thêm câu trắc nghiệm",
  fill: "Thêm câu điền từ",
  order: "Thêm câu sắp xếp",
  listen: "Thêm câu nghe",
  dictation: "Thêm câu chính tả",
};

export function isTextQuestion(question: DraftQuestion): question is TextQuestion {
  return question.type === "choice" || question.type === "fill" || question.type === "order";
}

// A bank question for a Chinese class carries zh-exact-v1; nothing else marks its language.
export function editorLanguageTag(question: TextQuestion): TeachingLanguageTag {
  return question.gradingProfile === "zh-exact-v1" ? "zh-Hans" : "ja-JP";
}

export function toQuestionDraft(question: TextQuestion, key: number): TestQuestionDraft {
  const base = {
    key,
    passage: question.passage ?? "",
    prompt: question.prompt,
    explain: question.explain,
    points: question.points,
  };
  switch (question.type) {
    case "choice":
      return {
        ...base,
        type: "choice",
        options: question.options,
        answer: question.answer,
        multiple: question.multiple,
      };
    case "fill":
      return {
        ...base,
        type: "fill",
        acceptedText: question.answer.join("\n"),
        inputMode: question.inputMode,
        kanjiStrict: question.kanjiStrict,
      };
    case "order":
      return { ...base, type: "order", pieces: toOrderPieces(question).join("\n") };
  }
}

// A fill answer typed through a Chinese input follows the Chinese rules and one typed through a
// Japanese input the Japanese rules. Other questions keep their profile, which sets their display.
function profileAfterEdit(draft: TestQuestionDraft, original: TextQuestion) {
  if (draft.type === "fill" && draft.inputMode !== "text") {
    return draft.inputMode === "chinese" || draft.inputMode === "pinyin"
      ? "zh-exact-v1"
      : undefined;
  }
  return original.gradingProfile;
}

// Keeps ID, tags and passage. Blank answer lines and pieces stay while typing and are dropped
// on publish.
export function fromQuestionDraft(draft: TestQuestionDraft, original: TextQuestion): DraftQuestion {
  const gradingProfile = profileAfterEdit(draft, original);
  const shared = {
    id: original.id,
    tags: original.tags,
    ...(draft.passage ? { passage: draft.passage } : {}),
    prompt: draft.prompt,
    explain: draft.explain,
    points: Number.isInteger(draft.points) ? Math.max(0, Math.min(100, draft.points)) : 0,
    ...(gradingProfile ? { gradingProfile } : {}),
  };
  switch (draft.type) {
    case "choice":
      return {
        ...shared,
        type: "choice",
        options: draft.options,
        answer: draft.answer,
        multiple: draft.multiple,
      };
    case "fill":
      return {
        ...shared,
        type: "fill",
        answer: draft.acceptedText.split("\n"),
        inputMode: draft.inputMode,
        kanjiStrict: draft.kanjiStrict,
      };
    case "order":
      return { ...shared, type: "order", ...toOrderTokens(draft.pieces.split("\n")) };
  }
}

// A question added for the same passage shares its text exactly, so a daily set keeps the two
// together, and keeps the language of the question it was added from.
export function createQuestion(
  id: string,
  type: NewQuestionType,
  from?: Pick<TextQuestion, "passage" | "gradingProfile">,
): DraftQuestion {
  const shared = {
    id,
    ...(from?.passage ? { passage: from.passage } : {}),
    prompt: "",
    explain: "",
    points: 1,
    tags: [],
    ...(from?.gradingProfile ? { gradingProfile: from.gradingProfile } : {}),
  };
  const listening = { transcript: "", audio: null, maxListens: null };
  switch (type) {
    case "choice":
      return { ...shared, type, options: ["", ""], answer: [], multiple: false };
    case "fill":
      return { ...shared, type, answer: [""], inputMode: "hiragana", kanjiStrict: false };
    case "order":
      return { ...shared, type, tokens: [], answer: [] };
    case "listen":
      return {
        ...shared,
        ...listening,
        type,
        responseType: "choice",
        options: ["", ""],
        answer: [],
      };
    case "dictation":
      return {
        ...shared,
        ...listening,
        type,
        answer: [""],
        inputMode: "japanese",
        kanjiStrict: false,
      };
  }
}
