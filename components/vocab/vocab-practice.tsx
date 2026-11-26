"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { playFeedbackSound } from "@/components/feedback-sound";
import { usePracticeKeys } from "@/components/practice-keys";
import { SoundToggle } from "@/components/sound-toggle";
import { Button } from "@/components/ui/button";
import { PracticeScore } from "@/components/ui/score-ring";
import { withWord } from "@/lib/jlpt-vocab";
import { countPracticeStreak } from "@/lib/practice-streak";
import { createVocabSession, VOCAB_KIND_LABELS, VOCAB_KINDS } from "@/lib/vocab-practice";

import type { JlptVocab } from "@/lib/jlpt-vocab";
import type { VocabKind, VocabQuestion } from "@/lib/vocab-practice";
import type { FormEvent } from "react";

interface VocabPracticeProps {
  items: JlptVocab[];
  // Wrong options for meanings and synonyms may come from the whole level, not only the group.
  pool: JlptVocab[];
}

interface Answer {
  question: VocabQuestion;
  choice: number;
}

const TITLES: Record<VocabKind, string> = {
  fill: "Chọn từ điền vào （　　）",
  similar: "Từ hoặc cụm nào gần nghĩa nhất?",
  meaning: "Từ này nghĩa là gì?",
};

function optionLang(kind: VocabKind) {
  return kind === "meaning" ? "vi" : "ja";
}

function resultOf(question: VocabQuestion, chosen: number, index: number) {
  if (index === question.answerIndex) {
    return "correct";
  }
  return chosen === index ? "wrong" : undefined;
}

// What the learner sees after checking: the sentence with the word in place, its translation and
// the word itself, so a wrong pick is corrected with the whole context.
function Explanation({ item }: { item: JlptVocab }) {
  return (
    <span>
      <span lang="ja">{withWord(item.example.ja)}</span> {item.example.vi}{" "}
      <span lang="ja">
        {item.word}（{item.reading}）
      </span>
      : {item.meaning}.
    </span>
  );
}

export function VocabPractice({ items, pool }: VocabPracticeProps) {
  const [kinds, setKinds] = useState<VocabKind[]>(["fill", "similar"]);
  const [questionCount, setQuestionCount] = useState(items.length > 10 ? "10" : "all");
  const [questions, setQuestions] = useState<VocabQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [inputError, setInputError] = useState("");
  const [isDone, setIsDone] = useState(false);
  const sessionRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const isAnswering = questions.length > 0 && !isDone && !isChecked;
  // On a computer: 1–4 pick an option and Enter checks; after checking, focus waits on "next".
  usePracticeKeys({
    optionCount: isAnswering ? (questions[index]?.options.length ?? 0) : 0,
    onPick: setChosen,
    formRef,
  });
  useEffect(() => {
    if (isChecked) {
      submitRef.current?.focus();
    }
  }, [isChecked]);
  // A new session brings the question to the top of the window (see the kanji practice).
  useEffect(() => {
    if (questions.length && index === 0 && !isChecked && !isDone) {
      sessionRef.current?.scrollIntoView({ block: "start" });
    }
  }, [questions, index, isChecked, isDone]);

  function start(next: VocabQuestion[]) {
    setQuestions(next);
    setIndex(0);
    setAnswers([]);
    setChosen(null);
    setIsChecked(false);
    setInputError("");
    setIsDone(false);
  }

  function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const count = questionCount === "all" ? items.length : Number(questionCount);
    start(createVocabSession(items, kinds, count, pool));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = questions[index];
    if (!question) {
      return;
    }
    if (isChecked) {
      setChosen(null);
      setIsChecked(false);
      if (index + 1 === questions.length) {
        setIsDone(true);
      } else {
        setIndex(index + 1);
      }
      return;
    }
    if (chosen === null) {
      setInputError("Bạn chọn một đáp án trước nhé.");
      return;
    }
    setInputError("");
    playFeedbackSound(chosen === question.answerIndex ? "correct" : "wrong");
    setAnswers([...answers, { question, choice: chosen }]);
    setIsChecked(true);
  }

  if (!questions.length) {
    return (
      <form className="practice-setup" onSubmit={handleStart}>
        <fieldset>
          <legend>Dạng câu</legend>
          <div className="group-options">
            {VOCAB_KINDS.map((kind) => (
              <label className="choice-label" key={kind}>
                <input
                  type="checkbox"
                  checked={kinds.includes(kind)}
                  onChange={(event) =>
                    setKinds((current) =>
                      event.target.checked
                        ? [...current, kind]
                        : current.filter((selected) => selected !== kind),
                    )
                  }
                />
                {VOCAB_KIND_LABELS[kind]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="vocab-count">Số câu mỗi phiên</label>
          <select
            id="vocab-count"
            value={questionCount}
            onChange={(event) => setQuestionCount(event.target.value)}
          >
            {[10, 20]
              .filter((size) => size < items.length)
              .map((size) => (
                <option key={size} value={size}>
                  {size} câu
                </option>
              ))}
            <option value="all">Tất cả {items.length} từ</option>
          </select>
        </div>
        <p className="small muted">
          {kinds.length
            ? "Mỗi từ xuất hiện một lần trong phiên. Từ không có từ gần nghĩa được hỏi dạng khác."
            : "Chọn ít nhất một dạng câu để bắt đầu."}
        </p>
        <Button type="submit" disabled={!kinds.length}>
          Bắt đầu luyện
        </Button>
        <p className="small muted">Phiên luyện này không lưu điểm.</p>
      </form>
    );
  }

  if (isDone) {
    const mistakes = answers.filter((answer) => answer.choice !== answer.question.answerIndex);
    return (
      <div className="practice-result">
        <h2>Bạn đã hoàn thành phiên luyện</h2>
        <PracticeScore
          correctCount={answers.length - mistakes.length}
          totalCount={answers.length}
          unit="câu đúng"
          bestStreak={
            countPracticeStreak(
              answers.map((answer) => answer.choice === answer.question.answerIndex),
            ).best
          }
        />
        <p>
          {mistakes.length
            ? "Ôn lại những từ dưới đây rồi luyện lại câu sai."
            : "Bạn đã làm đúng tất cả các câu trong phiên này."}
        </p>
        {mistakes.length > 0 && (
          <ul className="mistake-list">
            {mistakes.map(({ question, choice }) => (
              <li key={question.id}>
                <span lang="ja">{question.item.word}</span>
                <span>
                  <span className="muted">
                    Bạn chọn:{" "}
                    <span lang={optionLang(question.kind)}>{question.options[choice]}</span>
                  </span>
                  <br />
                  <Explanation item={question.item} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="button-row">
          {mistakes.length > 0 && (
            <Button onClick={() => start(mistakes.map((mistake) => mistake.question))}>
              Luyện lại câu sai
            </Button>
          )}
          <Button variant="outline" onClick={() => start([])}>
            Chọn phiên mới
          </Button>
        </div>
      </div>
    );
  }

  const question = questions[index];
  const last = answers[answers.length - 1];
  const isCorrect = isChecked && last?.choice === question.answerIndex;
  let submitLabel = "Kiểm tra";
  if (isChecked) {
    submitLabel = index + 1 === questions.length ? "Xem kết quả" : "Câu tiếp theo";
  }
  return (
    <div className="practice-session practice-split" ref={sessionRef}>
      <div className="practice-top">
        <p>Từ vựng</p>
        <span className="practice-top-end">
          <span>
            Câu {index + 1} / {questions.length}
          </span>
          <SoundToggle />
        </span>
      </div>
      <progress
        value={index + (isChecked ? 1 : 0)}
        max={questions.length}
        aria-label="Tiến độ phiên luyện"
      />
      <h2 className="practice-title">{TITLES[question.kind]}</h2>
      <div className="flashcard vocab-prompt" data-kind={question.kind}>
        <span className="vocab-prompt-text" lang="ja" data-testid="vocab-prompt">
          {question.prompt}
        </span>
        {question.kind === "meaning" && question.item.word !== question.item.reading && (
          <span className="muted" lang="ja">
            {question.item.reading}
          </span>
        )}
      </div>
      <form ref={formRef} onSubmit={handleSubmit} className="form-card">
        <fieldset>
          <legend className="small muted">Chọn một đáp án</legend>
          <div className="choice-list">
            {question.options.map((option, optionIndex) => {
              const result =
                isChecked && last ? resultOf(question, last.choice, optionIndex) : undefined;
              return (
                <label
                  className="choice-option"
                  key={`${question.id}:${option}`}
                  data-result={result}
                >
                  <input
                    type="radio"
                    name="vocab-choice"
                    value={optionIndex}
                    checked={chosen === optionIndex}
                    disabled={isChecked}
                    onChange={() => setChosen(optionIndex)}
                  />
                  <span lang={optionLang(question.kind)}>{option}</span>
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
        {inputError && (
          <p className="error-text" role="alert">
            {inputError}
          </p>
        )}
        {isChecked && (
          <div
            className={`answer-feedback ${isCorrect ? "feedback-correct" : "feedback-wrong"}`}
            role="status"
          >
            {isCorrect ? (
              <Check size={20} aria-hidden="true" />
            ) : (
              <X size={20} aria-hidden="true" />
            )}
            <span>
              {isCorrect ? "Đúng rồi!" : "Chưa đúng."} <Explanation item={question.item} />
            </span>
          </div>
        )}
        <Button type="submit" ref={submitRef}>
          {submitLabel}
        </Button>
        <p className="practice-keys-hint small muted">
          Bàn phím: phím 1–4 để chọn, Enter để kiểm tra và sang câu tiếp.
        </p>
      </form>
    </div>
  );
}
