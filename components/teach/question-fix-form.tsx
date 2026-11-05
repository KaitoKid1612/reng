"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { fixQuestionAction } from "@/app/actions/assignment-fixes";
import { QUESTION_FURIGANA_HINT } from "@/components/editor/slide-labels";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

import type { FixQuestionState } from "@/app/actions/assignment-fixes";
import type { DisplayFix } from "@/lib/assignment-fix";

interface QuestionFixFormProps {
  assignmentId: string;
  questionId: string;
  hash: string;
  position: number;
  fix: DisplayFix;
  lang: string;
}

const FURIGANA_ONLY = "chỉ thêm hoặc bỏ furigana";

// Closed until the teacher asks for it, so a 60-question set stays a readable list. A saved fix
// closes the form and returns focus to its button; reopening it reads the page's new text.
export function QuestionFixForm({
  assignmentId,
  questionId,
  hash,
  position,
  fix,
  lang,
}: QuestionFixFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, isPending] = useActionState(
    async (previous: FixQuestionState, formData: FormData) => {
      const next = await fixQuestionAction(previous, formData);
      if (next.isSaved) {
        setIsOpen(false);
      }
      return next;
    },
    {},
  );
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen && state.isSaved) {
      toggle.current?.focus();
    }
  }, [isOpen, state.isSaved]);
  const id = `fix-${questionId}`;
  if (!isOpen) {
    return (
      <div>
        <Button
          ref={toggle}
          variant="outline"
          aria-label={`Sửa lỗi hiển thị câu ${position}`}
          onClick={() => setIsOpen(true)}
        >
          Sửa lỗi hiển thị
        </Button>
        <ActionFeedback state={{ error: state.error, notice: state.notice }} />
      </div>
    );
  }
  const values = state.values ?? fix;
  return (
    // React resets the form after each action; remounting with the typed values keeps them.
    <form
      key={state.values ? JSON.stringify(state.values) : "start"}
      action={action}
      className="question-fix-form"
    >
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="hash" value={hash} />
      <div className="field">
        <label htmlFor={`${id}-prompt`}>Đề bài</label>
        <textarea
          id={`${id}-prompt`}
          name="prompt"
          rows={3}
          maxLength={500}
          required
          lang={lang}
          defaultValue={values.prompt}
        />
      </div>
      {values.passage !== undefined && (
        <div className="field">
          <label htmlFor={`${id}-passage`}>Đoạn văn ({FURIGANA_ONLY})</label>
          <textarea
            id={`${id}-passage`}
            name="passage"
            rows={4}
            lang={lang}
            defaultValue={values.passage}
          />
        </div>
      )}
      {values.options && (
        <fieldset className="question-fix-list">
          <legend>Lựa chọn ({FURIGANA_ONLY})</legend>
          {values.options.map((option, index) => (
            <label key={index} className="field">
              <span>Lựa chọn {index + 1}</span>
              <input name="option" lang={lang} defaultValue={option} />
            </label>
          ))}
        </fieldset>
      )}
      {values.tokens && (
        <fieldset className="question-fix-list">
          <legend>Mảnh câu ({FURIGANA_ONLY})</legend>
          {values.tokens.map((token, index) => (
            <label key={index} className="field">
              <span>Mảnh {index + 1}</span>
              <input name="token" lang={lang} defaultValue={token} />
            </label>
          ))}
        </fieldset>
      )}
      {values.transcript !== undefined && (
        <div className="field">
          <label htmlFor={`${id}-transcript`}>Lời nghe ({FURIGANA_ONLY})</label>
          <textarea
            id={`${id}-transcript`}
            name="transcript"
            rows={3}
            lang={lang}
            defaultValue={values.transcript}
          />
        </div>
      )}
      <div className="field">
        <label htmlFor={`${id}-explain`}>Giải thích</label>
        <textarea
          id={`${id}-explain`}
          name="explain"
          rows={3}
          maxLength={1000}
          required
          defaultValue={values.explain}
        />
      </div>
      <p className="small muted">{QUESTION_FURIGANA_HINT}</p>
      <div className="button-row">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang lưu…" : "Lưu sửa"}
        </Button>
        <Button variant="ghost" onClick={() => setIsOpen(false)}>
          Đóng
        </Button>
      </div>
      <ActionFeedback state={{ error: state.error, notice: state.notice }} />
    </form>
  );
}
