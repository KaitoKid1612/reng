"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { AnswerInput } from "@/components/classroom/answer-input";
import { OrderField } from "@/components/classroom/order-field";
import { FuriganaText } from "@/components/lessons/japanese-text";
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
  // A JLPT mock exam: each clip plays once, with no pause, rewind or slow speed.
  isSinglePassListening?: boolean;
  // Typed answers move on with Enter; choices keep the browser's arrow-key behaviour.
  onEnter?: () => void;
  // The right options, once a practice answer has been checked; the list then marks them and a
  // wrong pick on the options themselves.
  revealedChoices?: readonly number[] | null;
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
  // A typed listening answer follows the question's language: Japanese converts romaji to
  // kana and accepts an IME; Chinese is typed with the learner's own IME, never turned into kana.
  return view.lang === "ja" ? "japanese" : "chinese";
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
  isSinglePassListening = false,
  onEnter,
  revealedChoices,
}: QuestionFieldProps) {
  const [localListens, setLocalListens] = useState(0);
  const fieldId = `question-${view.id}`;
  const meta = (
    <div className="question-meta">
      <span>
        Câu {position} / {total}
        {view.section && ` · ${view.section}`}
      </span>
      <span>{view.points} điểm</span>
    </div>
  );
  // Outside the fieldset too: a passage there would push the legend off the top border.
  const passage = view.passage ? (
    <blockquote className="question-passage" lang={view.lang}>
      <FuriganaText text={view.passage} />
    </blockquote>
  ) : null;
  const player =
    view.type === "listen" || view.type === "dictation" ? (
      <ListeningPlayer
        audio={view.audio}
        maxListens={view.maxListens}
        listenCount={listenCount ?? localListens}
        onListen={onListen ?? (() => setLocalListens((count) => count + 1))}
        isSinglePass={isSinglePassListening}
      />
    ) : null;
  const choices = describeChoices(view);

  if (view.type === "order") {
    return (
      <div className="question-field">
        {meta}
        {passage}
        <fieldset>
          <legend lang={view.lang}>
            <FuriganaText text={view.prompt} />
          </legend>
          <OrderField
            tokens={view.tokens}
            value={
              Array.isArray(value)
                ? value.filter((item): item is string => typeof item === "string")
                : []
            }
            lang={view.lang}
            isDisabled={isLocked}
            onValueChange={onAnswerChange}
          />
        </fieldset>
      </div>
    );
  }

  if (!choices) {
    return (
      <div className="question-field">
        {meta}
        {passage}
        <label htmlFor={fieldId} className="question-prompt" lang={view.lang}>
          <FuriganaText text={view.prompt} />
        </label>
        {player}
        <AnswerInput
          id={fieldId}
          value={typeof value === "string" ? value : ""}
          inputMode={textInputMode(view)}
          isDisabled={isLocked}
          enterKeyHint={onEnter && position < total ? "next" : "done"}
          onValueChange={onAnswerChange}
          onEnter={onEnter}
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
      {passage}
      <fieldset>
        <legend lang={view.lang}>
          <FuriganaText text={view.prompt} />
        </legend>
        {player}
        {choices.isMultiple && <p className="small muted">Chọn tất cả đáp án đúng.</p>}
        <div className="choice-list">
          {choices.options.map((option, index) => {
            const isChosen = selection.includes(index);
            let result: "correct" | "wrong" | undefined;
            if (revealedChoices?.includes(index)) {
              result = "correct";
            } else if (revealedChoices && isChosen) {
              result = "wrong";
            }
            return (
              <label key={index} className="choice-option" data-result={result}>
                <input
                  type={choices.isMultiple ? "checkbox" : "radio"}
                  name={fieldId}
                  checked={isChosen}
                  disabled={isLocked}
                  onChange={() => onAnswerChange(toggleIndex(selection, index, choices.isMultiple))}
                />
                <span lang={view.lang}>
                  <FuriganaText text={option} />
                </span>
                {result === "correct" && (
                  <>
                    <Check className="choice-mark" size={22} aria-hidden="true" />
                    <span className="visually-hidden">, đáp án đúng</span>
                  </>
                )}
                {result === "wrong" && (
                  <>
                    <X className="choice-mark" size={22} aria-hidden="true" />
                    <span className="visually-hidden">, bạn chọn, chưa đúng</span>
                  </>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
