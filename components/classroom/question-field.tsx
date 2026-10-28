"use client";

import { JapaneseInput } from "@/components/classroom/japanese-input";

import type { QuestionView } from "@/lib/assignment";
import type { RawAnswer } from "@/lib/grading/raw-answer";

interface QuestionFieldProps {
  view: QuestionView;
  position: number;
  total: number;
  value: RawAnswer | undefined;
  isLocked: boolean;
  onAnswerChange: (value: RawAnswer) => void;
}

function toggleIndex(selection: readonly number[], index: number, isMultiple: boolean) {
  if (!isMultiple) {
    return [index];
  }
  return selection.includes(index)
    ? selection.filter((item) => item !== index)
    : [...selection, index].sort((first, second) => first - second);
}

export function QuestionField({
  view,
  position,
  total,
  value,
  isLocked,
  onAnswerChange,
}: QuestionFieldProps) {
  const fieldId = `question-${view.id}`;
  const meta = (
    <div className="question-meta">
      <span>
        Câu {position} / {total}
      </span>
      <span>{view.points} điểm</span>
    </div>
  );

  if (view.type === "fill") {
    return (
      <div>
        {meta}
        <label htmlFor={fieldId} className="question-prompt" lang="ja">
          {view.prompt}
        </label>
        <JapaneseInput
          id={fieldId}
          value={typeof value === "string" ? value : ""}
          inputMode={view.inputMode}
          isDisabled={isLocked}
          onValueChange={onAnswerChange}
        />
      </div>
    );
  }

  const selection = Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number")
    : [];
  // The counter sits outside the fieldset because browsers always draw the legend first.
  return (
    <div>
      {meta}
      <fieldset>
        <legend lang="ja">{view.prompt}</legend>
        {view.multiple && <p className="small muted">Chọn tất cả đáp án đúng.</p>}
        <div className="choice-list">
          {view.options.map((option, index) => (
            <label key={index} className="choice-option">
              <input
                type={view.multiple ? "checkbox" : "radio"}
                name={fieldId}
                checked={selection.includes(index)}
                disabled={isLocked}
                onChange={() => onAnswerChange(toggleIndex(selection, index, view.multiple))}
              />
              <span lang="ja">{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
