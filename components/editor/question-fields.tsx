"use client";

import { TestQuestionEditor } from "@/components/teach/test-question-editor";
import { Button } from "@/components/ui/button";
import { findReferencingSlides, isEditableQuestion } from "@/lib/lesson-draft";

import type { DraftContent, DraftQuestion } from "@/lib/lesson-draft";
import type { EditorAction } from "@/lib/lesson-editor";
import type { TestQuestionDraft } from "@/lib/test-question-draft";

interface QuestionFieldsProps {
  content: DraftContent;
  dispatch: (action: EditorAction) => void;
  createId: () => string;
}

type EditableQuestion = Extract<DraftQuestion, { type: "choice" | "fill" }>;

function toQuestionDraft(question: EditableQuestion, key: number): TestQuestionDraft {
  if (question.type === "choice") {
    return {
      key,
      type: "choice",
      prompt: question.prompt,
      options: question.options,
      answer: question.answer,
      multiple: question.multiple,
      explain: question.explain,
      points: question.points,
    };
  }
  return {
    key,
    type: "fill",
    prompt: question.prompt,
    acceptedText: question.answer.join("\n"),
    inputMode: question.inputMode,
    kanjiStrict: question.kanjiStrict,
    explain: question.explain,
    points: question.points,
  };
}

// Keeps ID and tags; blank answer lines stay while typing and are dropped on publish.
function fromQuestionDraft(draft: TestQuestionDraft, original: EditableQuestion): DraftQuestion {
  const shared = {
    id: original.id,
    tags: original.tags,
    prompt: draft.prompt,
    explain: draft.explain,
    points: Number.isInteger(draft.points) ? Math.max(0, Math.min(100, draft.points)) : 0,
  };
  if (draft.type === "choice") {
    return {
      ...shared,
      type: "choice",
      options: draft.options,
      answer: draft.answer,
      multiple: draft.multiple,
    };
  }
  return {
    ...shared,
    type: "fill",
    answer: draft.acceptedText.split("\n"),
    inputMode: draft.inputMode,
    kanjiStrict: draft.kanjiStrict,
  };
}

function createQuestion(id: string, type: "choice" | "fill"): DraftQuestion {
  const shared = { id, prompt: "", explain: "", points: 1, tags: [] };
  return type === "choice"
    ? { ...shared, type, options: ["", ""], answer: [], multiple: false }
    : { ...shared, type, answer: [""], inputMode: "hiragana", kanjiStrict: false };
}

export function QuestionFields({ content, dispatch, createId }: QuestionFieldsProps) {
  return (
    <div>
      <p className="small muted">
        Câu luyện công khai dùng cho slide và bài luyện. Câu kiểm tra cần giữ kín đáp án nhập ở màn
        hình giao bài.
      </p>
      {content.questions.map((question, index) => {
        const slides = findReferencingSlides(content, question.id);
        const usage = slides.length
          ? `Đang dùng ở slide ${slides.map((slide) => content.slides.indexOf(slide) + 1).join(", ")}; đổi slide trước khi xóa.`
          : undefined;
        if (!isEditableQuestion(question)) {
          return (
            <p key={question.id} className="notice-panel">
              Câu {index + 1} ({question.type}) chưa sửa được trên web; nội dung được giữ nguyên.
            </p>
          );
        }
        return (
          <TestQuestionEditor
            key={question.id}
            draft={toQuestionDraft(question, index + 1)}
            position={index + 1}
            showProblems={false}
            removeBlockedReason={usage}
            onChange={(next) =>
              dispatch({ type: "updateQuestion", question: fromQuestionDraft(next, question) })
            }
            onRemove={() => dispatch({ type: "removeQuestion", id: question.id })}
          />
        );
      })}
      <div className="button-row">
        <Button
          variant="outline"
          onClick={() =>
            dispatch({ type: "addQuestion", question: createQuestion(createId(), "choice") })
          }
        >
          Thêm câu trắc nghiệm
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            dispatch({ type: "addQuestion", question: createQuestion(createId(), "fill") })
          }
        >
          Thêm câu điền từ
        </Button>
      </div>
    </div>
  );
}
