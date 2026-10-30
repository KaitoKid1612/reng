"use client";

import { Check, X } from "lucide-react";
import { useReducer, useState } from "react";

import { JapaneseInput } from "@/components/classroom/japanese-input";
import { Button } from "@/components/ui/button";
import {
  createKanjiSession,
  describeKanjiAnswer,
  getKanjiMistakes,
  initialKanjiPractice,
  KANJI_KIND_LABELS,
  KANJI_QUESTION_KINDS,
  kanjiPracticeReducer,
} from "@/lib/kanji-practice";

import type { KanjiQuestion, KanjiQuestionKind, KanjiWord } from "@/lib/kanji-practice";
import type { FormEvent } from "react";

interface KanjiPracticeProps {
  words: KanjiWord[];
}

const PROMPTS: Record<KanjiQuestionKind, string> = {
  reading: "Từ này đọc thế nào?",
  written: "Chữ Hán nào đúng?",
  meaning: "Từ này nghĩa là gì?",
};

function describeWord(question: KanjiQuestion) {
  const { word } = question;
  return `${word.written} đọc là ${word.reading}: ${word.meaning}.`;
}

export function KanjiPractice({ words }: KanjiPracticeProps) {
  const [kinds, setKinds] = useState<KanjiQuestionKind[]>(["reading", "written"]);
  const [questionCount, setQuestionCount] = useState(words.length > 10 ? "10" : "all");
  const [state, dispatch] = useReducer(kanjiPracticeReducer, initialKanjiPractice);
  const [answer, setAnswer] = useState("");
  const [inputError, setInputError] = useState("");

  function startSession(questions: KanjiQuestion[]) {
    setAnswer("");
    setInputError("");
    dispatch({ type: "start", questions });
  }

  function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const count = questionCount === "all" ? words.length : Number(questionCount);
    startSession(createKanjiSession(words, kinds, count));
  }

  function handleKindChange(kind: KanjiQuestionKind, isSelected: boolean) {
    setKinds((current) =>
      isSelected ? [...current, kind] : current.filter((selected) => selected !== kind),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase === "feedback") {
      setAnswer("");
      setInputError("");
      dispatch({ type: "next" });
      return;
    }
    if (!answer.trim()) {
      setInputError(
        state.questions[state.index]?.kind === "reading"
          ? "Bạn gõ cách đọc trước nhé."
          : "Bạn chọn một đáp án trước nhé.",
      );
      return;
    }
    setInputError("");
    dispatch({ type: "submit", answer });
  }

  if (state.phase === "idle") {
    return (
      <form className="practice-setup" onSubmit={handleStart}>
        <fieldset>
          <legend>Dạng câu</legend>
          <div className="group-options">
            {KANJI_QUESTION_KINDS.map((kind) => (
              <label className="choice-label" key={kind}>
                <input
                  type="checkbox"
                  checked={kinds.includes(kind)}
                  onChange={(event) => handleKindChange(kind, event.target.checked)}
                />
                {KANJI_KIND_LABELS[kind]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="kanji-count">Số câu mỗi phiên</label>
          <select
            id="kanji-count"
            value={questionCount}
            onChange={(event) => setQuestionCount(event.target.value)}
          >
            {[10, 20]
              .filter((size) => size < words.length)
              .map((size) => (
                <option key={size} value={size}>
                  {size} câu
                </option>
              ))}
            <option value="all">Tất cả {words.length} từ</option>
          </select>
        </div>
        <p className="small muted">
          {kinds.length
            ? `Bài có ${words.length} từ viết bằng chữ Hán. Mỗi từ xuất hiện một lần trong phiên.`
            : "Chọn ít nhất một dạng câu để bắt đầu."}
        </p>
        <Button type="submit" disabled={!kinds.length}>
          Bắt đầu luyện
        </Button>
        <p className="small muted">
          Phiên luyện chưa lưu điểm. Câu kanji giảng viên giao trong bài tập vẫn được chấm và vào sổ
          lỗi như thường.
        </p>
      </form>
    );
  }

  if (state.phase === "result") {
    const mistakes = getKanjiMistakes(state);
    return (
      <div className="practice-result">
        <h2>Bạn đã hoàn thành phiên luyện</h2>
        <p className="result-score">
          {state.records.length - mistakes.length}
          <span> / {state.records.length} câu đúng</span>
        </p>
        <p>
          {mistakes.length
            ? "Ôn lại những từ dưới đây rồi luyện lại câu sai."
            : "Bạn đã làm đúng tất cả các câu trong phiên này."}
        </p>
        {mistakes.length > 0 && (
          <ul className="mistake-list">
            {mistakes.map(({ question, answer: given }) => (
              <li key={question.id}>
                <span lang="ja" className="kana-font">
                  {question.word.written}
                </span>
                <span>
                  <span className="muted">Bạn trả lời: {describeKanjiAnswer(question, given)}</span>
                  <br />
                  <span lang="ja">{question.word.reading}</span>: {question.word.meaning}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="button-row">
          {mistakes.length > 0 && (
            <Button onClick={() => startSession(mistakes.map((mistake) => mistake.question))}>
              Luyện lại câu sai
            </Button>
          )}
          <Button variant="outline" onClick={() => dispatch({ type: "reset" })}>
            Chọn phiên mới
          </Button>
        </div>
      </div>
    );
  }

  const question = state.questions[state.index];
  if (!question) {
    throw new Error("The active kanji question is missing from the session.");
  }
  const feedback = state.phase === "feedback" ? state.records[state.index] : undefined;
  let submitLabel = "Kiểm tra";
  if (feedback) {
    submitLabel = state.index + 1 === state.questions.length ? "Xem kết quả" : "Câu tiếp theo";
  }
  return (
    <div className="practice-session">
      <div className="practice-top">
        <p>Kanji</p>
        <span>
          Câu {state.index + 1} / {state.questions.length}
        </span>
      </div>
      <progress
        value={state.index + (feedback ? 1 : 0)}
        max={state.questions.length}
        aria-label="Tiến độ phiên luyện"
      />
      <h2 className="practice-title">{PROMPTS[question.kind]}</h2>
      <div className="flashcard">
        {question.kind === "written" ? (
          <>
            <span className="flashcard-front" lang="ja" data-testid="kanji-prompt">
              {question.word.reading}
            </span>
            <p>{question.word.meaning}</p>
          </>
        ) : (
          <span className="flashcard-front" lang="ja" data-testid="kanji-prompt">
            {question.word.written}
          </span>
        )}
      </div>
      {/* .answer-form stretches every input, so choice questions use the card form instead. */}
      <form
        onSubmit={handleSubmit}
        className={question.kind === "reading" ? "answer-form" : "form-card"}
      >
        {question.kind === "reading" ? (
          <>
            <label htmlFor="kanji-answer">Cách đọc bằng hiragana</label>
            <JapaneseInput
              key={question.id}
              id="kanji-answer"
              value={answer}
              inputMode="hiragana"
              isDisabled={Boolean(feedback)}
              describedBy={inputError ? "kanji-input-error" : undefined}
              onValueChange={setAnswer}
            />
          </>
        ) : (
          <fieldset>
            <legend className="small muted">Chọn một đáp án</legend>
            <div className="choice-list">
              {question.options.map((option, index) => (
                <label className="choice-option" key={`${question.id}:${option}`}>
                  <input
                    type="radio"
                    name="kanji-choice"
                    value={index}
                    checked={answer === String(index)}
                    disabled={Boolean(feedback)}
                    onChange={() => setAnswer(String(index))}
                  />
                  <span lang={question.kind === "written" ? "ja" : "vi"}>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {inputError && (
          <p id="kanji-input-error" className="error-text" role="alert">
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
              {feedback.correct ? "Đúng rồi!" : "Chưa đúng."} {describeWord(question)}
            </span>
          </div>
        )}
        <Button type="submit">{submitLabel}</Button>
      </form>
    </div>
  );
}
