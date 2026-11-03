"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { AnswerInput } from "@/components/classroom/answer-input";
import { Button } from "@/components/ui/button";
import { isPinyinCorrect, pickPinyinSession, PINYIN_SESSION_SIZE } from "@/lib/pinyin-study";

import type { PinyinWord } from "@/lib/pinyin-study";

interface PinyinPracticeProps {
  words: readonly PinyinWord[];
}

interface Attempt {
  word: PinyinWord;
  answer: string;
  isCorrect: boolean;
}

// The session is drawn on click, never during render, so the page renders the same on the server.
export function PinyinPractice({ words }: PinyinPracticeProps) {
  const [queue, setQueue] = useState<PinyinWord[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState<Attempt | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [error, setError] = useState("");
  const isDone = queue.length > 0 && attempts.length === queue.length && checked === null;

  function start(source: readonly PinyinWord[]) {
    setQueue(pickPinyinSession(source, PINYIN_SESSION_SIZE, Math.random));
    setIndex(0);
    setAnswer("");
    setChecked(null);
    setAttempts([]);
    setError("");
  }

  // Enter or the button checks the answer first, then moves to the next word.
  function handleNext() {
    if (checked) {
      setChecked(null);
      setAnswer("");
      setIndex((current) => current + 1);
      return;
    }
    if (!answer.trim()) {
      setError("Gõ pinyin trước khi kiểm tra.");
      return;
    }
    const word = queue[index];
    const attempt = { word, answer, isCorrect: isPinyinCorrect(answer, word) };
    setError("");
    setChecked(attempt);
    setAttempts((current) => [...current, attempt]);
  }

  if (queue.length === 0) {
    return (
      <div className="practice-setup">
        <h1>Luyện gõ pinyin</h1>
        <p>
          Mỗi phiên {PINYIN_SESSION_SIZE} từ thông dụng: nhìn chữ Hán và nghĩa, gõ pinyin có dấu
          thanh. Không có dấu trên bàn phím thì gõ số thanh sau mỗi âm tiết: ni3 hao3 → nǐ hǎo, v
          thay cho ü (nv3 → nǚ).
        </p>
        <Button onClick={() => start(words)}>Bắt đầu luyện</Button>
      </div>
    );
  }

  if (isDone) {
    const mistakes = attempts.filter((attempt) => !attempt.isCorrect);
    return (
      <div className="practice-result">
        <h1>Bạn đã hoàn thành phiên luyện</h1>
        <p className="result-score">
          {attempts.length - mistakes.length}
          <span> / {attempts.length} từ đúng</span>
        </p>
        <p>
          {mistakes.length
            ? "Ôn lại những từ dưới đây, chú ý dấu thanh."
            : "Bạn đã gõ đúng tất cả các từ trong phiên này."}
        </p>
        {mistakes.length > 0 && (
          <ul className="mistake-list">
            {mistakes.map(({ word, answer: typed }) => (
              <li key={word.id}>
                <span lang="zh-Hans" className="pinyin-hanzi">
                  {word.hanzi}
                </span>
                <span>
                  <span className="muted">Bạn gõ: {typed}</span>
                  <br />
                  Đúng: <span lang="zh-Latn-pinyin">{word.pinyin}</span> ({word.meaning})
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="button-row">
          {mistakes.length > 0 && (
            <Button onClick={() => start(mistakes.map((attempt) => attempt.word))}>
              Luyện lại từ sai
            </Button>
          )}
          <Button variant="outline" onClick={() => start(words)}>
            Phiên mới
          </Button>
        </div>
      </div>
    );
  }

  const word = queue[index];
  let buttonLabel = "Kiểm tra";
  if (checked) {
    buttonLabel = index + 1 === queue.length ? "Xem kết quả" : "Từ tiếp theo";
  }
  return (
    <div className="practice-session">
      <div className="practice-top">
        <p>Pinyin</p>
        <span>
          Từ {index + 1} / {queue.length}
        </span>
      </div>
      <progress
        value={index + (checked ? 1 : 0)}
        max={queue.length}
        aria-label="Tiến độ phiên luyện"
      />
      <h1 className="practice-title">Từ này đọc thế nào?</h1>
      <div className="writing-square question-square pinyin-question">
        <span lang="zh-Hans" className="pinyin-hanzi">
          {word.hanzi}
        </span>
      </div>
      <p className="pinyin-meaning">{word.meaning}</p>
      <div className="answer-form">
        <label htmlFor="pinyin-answer">Pinyin có dấu thanh</label>
        <AnswerInput
          key={word.id}
          id="pinyin-answer"
          value={answer}
          inputMode="pinyin"
          isDisabled={checked !== null}
          autoFocus
          enterKeyHint="next"
          describedBy={error ? "pinyin-error" : undefined}
          onValueChange={(value) => {
            setAnswer(value);
            setError("");
          }}
          onEnter={handleNext}
        />
        {error && (
          <p id="pinyin-error" className="error-text" role="alert">
            {error}
          </p>
        )}
        {checked && (
          <div
            className={`answer-feedback ${checked.isCorrect ? "feedback-correct" : "feedback-wrong"}`}
            role="status"
          >
            {checked.isCorrect ? (
              <Check size={20} aria-hidden="true" />
            ) : (
              <X size={20} aria-hidden="true" />
            )}
            <span>
              {checked.isCorrect ? "Đúng rồi!" : "Chưa đúng."} Pinyin:{" "}
              <strong lang="zh-Latn-pinyin">{word.pinyin}</strong>
            </span>
          </div>
        )}
        {/* Checking locks the field, so focus moves to this button and Enter goes on. */}
        <Button key={checked ? "next" : "check"} autoFocus={checked !== null} onClick={handleNext}>
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
