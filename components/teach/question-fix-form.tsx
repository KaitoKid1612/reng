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
  /** Options that count as right, so the teacher sees which one each box is. */
  correctOptions?: readonly number[];
}

const FURIGANA_ONLY = "chỉ thêm hoặc bỏ furigana";

// Closed until the teacher asks for it, so a 60-question set stays a readable list. The fields
// are controlled, so a refused save keeps what was typed and focus stays where it was; opening
// moves focus to the prompt, and closing or saving returns it to this question's button.
export function QuestionFixForm({
  assignmentId,
  questionId,
  hash,
  position,
  fix,
  lang,
  correctOptions = [],
}: QuestionFixFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<DisplayFix>(fix);
  // The version the teacher started from: a save made elsewhere since then is a conflict, even
  // after this page refreshes for another question's save.
  const [openedHash, setOpenedHash] = useState(hash);
  const [shouldFocusToggle, setShouldFocusToggle] = useState(false);
  const [state, action, isPending] = useActionState(
    async (previous: FixQuestionState, formData: FormData) => {
      const next = await fixQuestionAction(previous, formData);
      if (next.isSaved) {
        setIsOpen(false);
        setShouldFocusToggle(true);
      }
      return next;
    },
    {},
  );
  const toggle = useRef<HTMLButtonElement>(null);
  const prompt = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (isOpen) {
      prompt.current?.focus();
    } else if (shouldFocusToggle) {
      toggle.current?.focus();
    }
  }, [isOpen, shouldFocusToggle]);
  const id = `fix-${questionId}`;
  const feedback = <ActionFeedback state={{ error: state.error, notice: state.notice }} />;

  function open() {
    // The page may have new text since the last save; start from it.
    setValues(fix);
    setOpenedHash(hash);
    setShouldFocusToggle(false);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    setShouldFocusToggle(true);
  }

  if (!isOpen) {
    return (
      <div>
        <Button
          ref={toggle}
          variant="outline"
          aria-label={`Sửa lỗi hiển thị câu ${position}`}
          onClick={open}
        >
          Sửa lỗi hiển thị
        </Button>
        {feedback}
      </div>
    );
  }
  const setText = (key: "prompt" | "explain" | "passage" | "transcript", value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const setItem = (key: "options" | "tokens", index: number, value: string) =>
    setValues((current) => ({
      ...current,
      [key]: current[key]?.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  return (
    <form action={action} className="question-fix-form" aria-label={`Sửa câu ${position}`}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="hash" value={openedHash} />
      <div className="field">
        <label htmlFor={`${id}-prompt`}>Đề bài</label>
        <textarea
          ref={prompt}
          id={`${id}-prompt`}
          name="prompt"
          rows={3}
          maxLength={500}
          required
          lang={lang}
          value={values.prompt}
          onChange={(event) => setText("prompt", event.target.value)}
        />
      </div>
      {values.passage !== undefined && (
        <div className="field">
          <label htmlFor={`${id}-passage`}>Đoạn văn ({FURIGANA_ONLY})</label>
          <textarea
            id={`${id}-passage`}
            name="passage"
            rows={6}
            lang={lang}
            value={values.passage}
            onChange={(event) => setText("passage", event.target.value)}
          />
        </div>
      )}
      {values.options && (
        <fieldset className="question-fix-list">
          <legend>Lựa chọn ({FURIGANA_ONLY})</legend>
          {values.options.map((option, index) => (
            <div key={index} className="field">
              <label htmlFor={`${id}-option-${index}`}>
                Lựa chọn {index + 1}
                {correctOptions.includes(index) ? " (đáp án đúng)" : ""}
              </label>
              <input
                id={`${id}-option-${index}`}
                name="option"
                lang={lang}
                value={option}
                onChange={(event) => setItem("options", index, event.target.value)}
              />
            </div>
          ))}
        </fieldset>
      )}
      {values.tokens && (
        <fieldset className="question-fix-list">
          <legend>Mảnh câu ({FURIGANA_ONLY})</legend>
          {values.tokens.map((token, index) => (
            <div key={index} className="field">
              <label htmlFor={`${id}-token-${index}`}>Mảnh {index + 1}</label>
              <input
                id={`${id}-token-${index}`}
                name="token"
                lang={lang}
                value={token}
                onChange={(event) => setItem("tokens", index, event.target.value)}
              />
            </div>
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
            value={values.transcript}
            onChange={(event) => setText("transcript", event.target.value)}
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
          value={values.explain}
          onChange={(event) => setText("explain", event.target.value)}
        />
      </div>
      <p className="small muted">{QUESTION_FURIGANA_HINT}</p>
      <div className="button-row">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang lưu…" : "Lưu sửa"}
        </Button>
        <Button variant="ghost" onClick={close}>
          Đóng
        </Button>
      </div>
      {feedback}
    </form>
  );
}
