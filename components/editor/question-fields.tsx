"use client";

import { ListeningQuestionEditor } from "@/components/editor/listening-question-editor";
import { TestQuestionEditor } from "@/components/teach/test-question-editor";
import { QUESTION_FURIGANA_HINT } from "@/components/editor/slide-labels";
import { Button } from "@/components/ui/button";
import {
  ADD_QUESTION_LABELS,
  createQuestion,
  editorLanguageTag,
  fromQuestionDraft,
  isTextQuestion,
  toQuestionDraft,
} from "@/lib/editor-questions";
import { findReferencingSlides, isListeningDraft } from "@/lib/lesson-draft";

import type { DraftContent } from "@/lib/lesson-draft";
import type { EditorAction } from "@/lib/lesson-editor";

interface QuestionFieldsProps {
  content: DraftContent;
  dispatch: (action: EditorAction) => void;
  createId: () => string;
}

const NEW_QUESTION_TYPES = ["choice", "fill", "order", "match", "listen", "dictation"] as const;

export function QuestionFields({ content, dispatch, createId }: QuestionFieldsProps) {
  return (
    <div>
      <p className="small muted">
        Câu luyện công khai dùng cho slide và bài luyện. Câu kiểm tra cần giữ kín đáp án nhập ở màn
        hình giao bài.
      </p>
      <p className="small muted">{QUESTION_FURIGANA_HINT}</p>
      {content.questions.map((question, index) => {
        const slides = findReferencingSlides(content, question.id);
        const usage = slides.length
          ? `Đang dùng ở slide ${slides.map((slide) => content.slides.indexOf(slide) + 1).join(", ")}; đổi slide trước khi xóa.`
          : undefined;
        if (isListeningDraft(question)) {
          return (
            <ListeningQuestionEditor
              key={question.id}
              question={question}
              position={index + 1}
              removeBlockedReason={usage}
              onChange={(next) => dispatch({ type: "updateQuestion", question: next })}
              onRemove={() => dispatch({ type: "removeQuestion", id: question.id })}
            />
          );
        }
        if (!isTextQuestion(question)) {
          return null;
        }
        return (
          <TestQuestionEditor
            key={question.id}
            draft={toQuestionDraft(question, index + 1)}
            languageTag={editorLanguageTag(question)}
            position={index + 1}
            showProblems={false}
            removeBlockedReason={usage}
            onChange={(next) =>
              dispatch({ type: "updateQuestion", question: fromQuestionDraft(next, question) })
            }
            onRemove={() => dispatch({ type: "removeQuestion", id: question.id })}
            onAddSamePassage={() =>
              dispatch({
                type: "addQuestion",
                question: createQuestion(createId(), "choice", question),
                afterId: question.id,
              })
            }
          />
        );
      })}
      <div className="button-row">
        {NEW_QUESTION_TYPES.map((type) => (
          <Button
            key={type}
            variant="outline"
            onClick={() =>
              dispatch({ type: "addQuestion", question: createQuestion(createId(), type) })
            }
          >
            {ADD_QUESTION_LABELS[type]}
          </Button>
        ))}
      </div>
    </div>
  );
}
