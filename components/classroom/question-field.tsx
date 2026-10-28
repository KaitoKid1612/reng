"use client";

import { useState } from "react";

import { JapaneseInput } from "@/components/classroom/japanese-input";
import { ListeningPlayer } from "@/components/listening/listening-player";

import type { InputMode, QuestionView } from "@/lib/assignment";
import type { RawAnswer } from "@/lib/grading/raw-answer";

interface QuestionFieldProps {
  view: QuestionView;
  position: number;
  total: number;
  value: RawAnswer | undefined;
  isLocked: boolean;
  onAnswerChange: (value: RawAnswer) => void;
  listenCount?: number;
  onListen?: () => void;
}

function toggleIndex(selection: readonly number[], index: number, isMultiple: boolean) {
  if (!isMultiple) {
    return [index];
  }
  return selection.includes(index)
    ? selection.filter((item) => item !== index)
    : [...selection, index].sort((first, second) => first - second);
}

function describeChoices(view: QuestionView) {
  if (view.type === "choice") {
    return { options: view.options, isMultiple: view.multiple };
  }
  if (view.type === "listen" && view.responseType === "choice") {
    return { options: view.options, isMultiple: false };
  }
  return null;
}

function textInputMode(view: QuestionView): InputMode {
  if (view.type === "fill" || view.type === "dictation") {
    return view.inputMode;
  }
  // Listening answers may be kana or kanji, so learners can type romaji or use an IME.
  return "japanese";
}

export function QuestionField({
  view,
  position,
  total,
  value,
  isLocked,
  onAnswerChange,
  listenCount,
  onListen,
}: QuestionFieldProps) {
  const [localListens, setLocalListens] = useState(0);
  const fieldId = `question-${view.id}`;
  const meta = (
    <div className="question-meta">
      <span>
        Câu {position} / {total}
      </span>
      <span>{view.points} điểm</span>
    </div>
  );
  const player =
    view.type === "listen" || view.type === "dictation" ? (
      <ListeningPlayer
        audio={view.audio}
        maxListens={view.maxListens}
        listenCount={listenCount ?? localListens}
        onListen={onListen ?? (() => setLocalListens((count) => count + 1))}
      />
    ) : null;
  const choices = describeChoices(view);

  if (!choices) {
    return (
      <div>
        {meta}
        <label htmlFor={fieldId} className="question-prompt" lang="ja">
          {view.prompt}
        </label>
        {player}
        <JapaneseInput
          id={fieldId}
          value={typeof value === "string" ? value : ""}
          inputMode={textInputMode(view)}
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
        {player}
        {choices.isMultiple && <p className="small muted">Chọn tất cả đáp án đúng.</p>}
        <div className="choice-list">
          {choices.options.map((option, index) => (
            <label key={index} className="choice-option">
              <input
                type={choices.isMultiple ? "checkbox" : "radio"}
                name={fieldId}
                checked={selection.includes(index)}
                disabled={isLocked}
                onChange={() => onAnswerChange(toggleIndex(selection, index, choices.isMultiple))}
              />
              <span lang="ja">{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
