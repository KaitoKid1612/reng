import { Check, Volume2, X } from "lucide-react";

import { AudioStatus, useAudio } from "@/components/audio-provider";
import { Button } from "@/components/ui/button";

import type { KanaItem, KanaScript, PracticeRecord } from "@/lib/kana";
import type { FormEvent, RefObject } from "react";

interface PracticeQuestionProps {
  script: KanaScript;
  item: KanaItem;
  questionIndex: number;
  totalCount: number;
  feedback: PracticeRecord | undefined;
  answer: string;
  inputError: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onAnswerChange: (answer: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function PracticeQuestion({
  script,
  item,
  questionIndex,
  totalCount,
  feedback,
  answer,
  inputError,
  inputRef,
  onAnswerChange,
  onSubmit,
}: PracticeQuestionProps) {
  const audio = useAudio();
  let submitLabel = "Kiểm tra";

  if (feedback) {
    submitLabel = questionIndex + 1 === totalCount ? "Xem kết quả" : "Câu tiếp theo";
  }

  return (
    <div className="practice-session">
      <div className="practice-top">
        <p>{script === "hiragana" ? "Hiragana" : "Katakana"}</p>
        <span>
          Câu {questionIndex + 1} / {totalCount}
        </span>
      </div>
      <progress
        value={questionIndex + (feedback ? 1 : 0)}
        max={totalCount}
        aria-label="Tiến độ phiên luyện"
      />
      <h1 className="practice-title">Chữ này đọc thế nào?</h1>
      <div className="writing-square question-square">
        <span lang="ja" className="kana-font" data-testid="question-kana">
          {item.kana}
        </span>
      </div>
      <form onSubmit={onSubmit} className="answer-form">
        <label htmlFor="romaji">Cách đọc bằng romaji</label>
        <input
          key={item.id}
          ref={inputRef}
          id="romaji"
          name="romaji"
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          readOnly={Boolean(feedback)}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          aria-invalid={Boolean(inputError)}
          aria-describedby={inputError ? "input-error" : "romaji-hint"}
        />
        <p id="romaji-hint" className="small muted">
          Gõ chữ Latin, ví dụ: shi, tsu, kya.
        </p>
        {inputError && (
          <p id="input-error" className="error-text" role="alert">
            {inputError}
          </p>
        )}
        {feedback && (
          <div
            className={`answer-feedback ${feedback.correct ? "feedback-correct" : "feedback-wrong"}`}
            role="status"
          >
            {feedback.correct ? (
              <Check size={20} aria-hidden="true" />
            ) : (
              <X size={20} aria-hidden="true" />
            )}
            <span>
              {feedback.correct ? "Đúng rồi!" : "Chưa đúng."} Cách đọc:{" "}
              <strong>{item.acceptedRomaji.join(" / ")}</strong>
            </span>
          </div>
        )}
        <Button type="submit">{submitLabel}</Button>
      </form>
      {feedback && (
        <div className="practice-audio">
          <Button variant="ghost" onClick={() => audio.play(item)}>
            <Volume2 size={18} aria-hidden="true" />
            Nghe cách đọc
          </Button>
          <AudioStatus />
        </div>
      )}
    </div>
  );
}
