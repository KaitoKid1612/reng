"use client";

import { Check, X } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";

import { AnswerInput } from "@/components/classroom/answer-input";
import { playFeedbackSound } from "@/components/feedback-sound";
import { usePracticeKeys } from "@/components/practice-keys";
import { SoundToggle } from "@/components/sound-toggle";
import { Button } from "@/components/ui/button";
import { PracticeScore } from "@/components/ui/score-ring";
import {
  createKanjiSession,
  describeKanjiAnswer,
  getKanjiMistakes,
  initialKanjiPractice,
  isCorrectKanjiAnswer,
  KANJI_KIND_LABELS,
  KANJI_QUESTION_KINDS,
  kanjiPracticeReducer,
} from "@/lib/kanji-practice";
import { countPracticeStreak } from "@/lib/practice-streak";

import type { InputMode } from "@/lib/assignment";
import type {
  CharacterLang,
  KanjiQuestion,
  KanjiQuestionKind,
  KanjiWord,
} from "@/lib/kanji-practice";
import type { FormEvent } from "react";

interface KanjiPracticeProps {
  words: KanjiWord[];
  lang: CharacterLang;
  // The kinds ticked at the start; the JLPT kanji pages start with the two exam kinds.
  defaultKinds?: KanjiQuestionKind[];
}

interface ScriptSettings {
  title: string;
  noun: string;
  readingLabel: string;
  inputMode: InputMode;
  readingLang: string;
}

// The same practice serves Japanese kanji and Chinese hanzi; only the names and the way a reading
// is typed differ (pinyin accepts tone numbers, ni3 → nǐ).
const SCRIPT_SETTINGS: Record<CharacterLang, ScriptSettings> = {
  ja: {
    title: "Kanji",
    noun: "kanji",
    readingLabel: "Cách đọc bằng hiragana",
    inputMode: "hiragana",
    readingLang: "ja",
  },
  "zh-Hans": {
    title: "Chữ Hán",
    noun: "chữ Hán",
    readingLabel: "Pinyin có dấu thanh",
    inputMode: "pinyin",
    readingLang: "zh-Latn-pinyin",
  },
  "zh-Hant": {
    title: "Chữ Hán",
    noun: "chữ Hán",
    readingLabel: "Pinyin có dấu thanh",
    inputMode: "pinyin",
    readingLang: "zh-Latn-pinyin",
  },
};

const PROMPTS: Record<KanjiQuestionKind, string> = {
  reading: "Từ này đọc thế nào?",
  readingChoice: "Từ này đọc thế nào?",
  written: "Chữ Hán nào đúng?",
  meaning: "Từ này nghĩa là gì?",
};

function optionLang(kind: KanjiQuestionKind, lang: CharacterLang, readingLang: string) {
  if (kind === "written") {
    return lang;
  }
  return kind === "readingChoice" ? readingLang : "vi";
}

// Japanese is written one character per writing square, like a page of a practice book; the
// squares are drawn for the eye and the word is read out whole. Pinyin and hanzi keep one line.
function PromptText({ text, lang }: { text: string; lang: string }) {
  if (lang !== "ja") {
    return (
      <span className="flashcard-front" lang={lang} data-testid="kanji-prompt">
        {text}
      </span>
    );
  }
  return (
    <span className="flashcard-front" lang="ja">
      <span className="visually-hidden" data-testid="kanji-prompt">
        {text}
      </span>
      <span className="prompt-cells" aria-hidden="true">
        {[...text].map((character, index) => (
          <span className="prompt-cell writing-square" key={index}>
            {character}
          </span>
        ))}
      </span>
    </span>
  );
}

// After checking, the right option and a wrong pick are marked on the list itself, as in class
// questions, so look-alike options can be compared side by side.
function choiceResult(question: KanjiQuestion, answer: string, index: number) {
  if (index === question.answerIndex) {
    return "correct";
  }
  return answer === String(index) ? "wrong" : undefined;
}

function describeWord(question: KanjiQuestion) {
  const { word } = question;
  return `${word.written} đọc là ${word.reading}: ${word.meaning}.`;
}

// Reading traps (voicing, long vowels, っ) are built from kana, so pinyin lessons keep typing.
function availableKinds(lang: CharacterLang) {
  return KANJI_QUESTION_KINDS.filter((kind) => kind !== "readingChoice" || lang === "ja");
}

export function KanjiPractice({
  words,
  lang,
  defaultKinds = ["reading", "written"],
}: KanjiPracticeProps) {
  const settings = SCRIPT_SETTINGS[lang];
  const [kinds, setKinds] = useState<KanjiQuestionKind[]>(defaultKinds);
  const [questionCount, setQuestionCount] = useState(words.length > 10 ? "10" : "all");
  const [state, dispatch] = useReducer(kanjiPracticeReducer, initialKanjiPractice);
  const [answer, setAnswer] = useState("");
  const [inputError, setInputError] = useState("");
  const sessionRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const current = state.questions[state.index];
  // On a computer: 1–4 pick an option and Enter checks; after checking, focus waits on "next".
  usePracticeKeys({
    optionCount:
      state.phase === "answering" && current?.kind !== "reading" ? current.options.length : 0,
    onPick: (index) => setAnswer(String(index)),
    formRef,
  });
  useEffect(() => {
    if (state.phase === "feedback") {
      submitRef.current?.focus();
    }
  }, [state.phase]);
  // A new session brings the question to the top of the window, so its options and the check
  // button fit a laptop screen without scrolling.
  useEffect(() => {
    if (state.phase === "answering" && state.index === 0) {
      sessionRef.current?.scrollIntoView({ block: "start" });
    }
  }, [state.phase, state.index, state.questions]);

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
    const question = state.questions[state.index];
    playFeedbackSound(question && isCorrectKanjiAnswer(question, answer) ? "correct" : "wrong");
    dispatch({ type: "submit", answer });
  }

  if (state.phase === "idle") {
    return (
      <form className="practice-setup" onSubmit={handleStart}>
        <fieldset>
          <legend>Dạng câu</legend>
          <div className="group-options">
            {availableKinds(lang).map((kind) => (
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
          Phiên luyện này không lưu điểm. Câu {settings.noun} giáo viên giao trong bài tập vẫn được
          chấm và vào sổ lỗi như thường.
        </p>
      </form>
    );
  }

  if (state.phase === "result") {
    const mistakes = getKanjiMistakes(state);
    return (
      <div className="practice-result">
        <h2>Bạn đã hoàn thành phiên luyện</h2>
        <PracticeScore
          correctCount={state.records.length - mistakes.length}
          totalCount={state.records.length}
          unit="câu đúng"
          bestStreak={countPracticeStreak(state.records.map((record) => record.correct)).best}
        />
        <p>
          {mistakes.length
            ? "Ôn lại những từ dưới đây rồi luyện lại câu sai."
            : "Bạn đã làm đúng tất cả các câu trong phiên này."}
        </p>
        {mistakes.length > 0 && (
          <ul className="mistake-list">
            {mistakes.map(({ question, answer: given }) => (
              <li key={question.id}>
                <span lang={lang} className={lang === "ja" ? "kana-font" : undefined}>
                  {question.word.written}
                </span>
                <span>
                  <span className="muted">Bạn trả lời: {describeKanjiAnswer(question, given)}</span>
                  <br />
                  <span lang={settings.readingLang}>{question.word.reading}</span>:{" "}
                  {question.word.meaning}
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
    <div className="practice-session practice-split" ref={sessionRef}>
      <div className="practice-top">
        <p>{settings.title}</p>
        <span className="practice-top-end">
          <span>
            Câu {state.index + 1} / {state.questions.length}
          </span>
          <SoundToggle />
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
            <PromptText text={question.word.reading} lang={settings.readingLang} />
            <p>{question.word.meaning}</p>
          </>
        ) : (
          <PromptText text={question.word.written} lang={lang} />
        )}
      </div>
      {/* .answer-form stretches every input, so choice questions use the card form instead. */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={question.kind === "reading" ? "answer-form" : "form-card"}
      >
        {question.kind === "reading" ? (
          <>
            <label htmlFor="kanji-answer">{settings.readingLabel}</label>
            <AnswerInput
              key={question.id}
              id="kanji-answer"
              value={answer}
              inputMode={settings.inputMode}
              isDisabled={Boolean(feedback)}
              autoFocus
              describedBy={inputError ? "kanji-input-error" : undefined}
              onValueChange={setAnswer}
            />
          </>
        ) : (
          <fieldset>
            <legend className="small muted">Chọn một đáp án</legend>
            <div className="choice-list">
              {question.options.map((option, index) => {
                const result = feedback ? choiceResult(question, answer, index) : undefined;
                return (
                  <label
                    className="choice-option"
                    key={`${question.id}:${option}`}
                    data-result={result}
                  >
                    <input
                      type="radio"
                      name="kanji-choice"
                      value={index}
                      checked={answer === String(index)}
                      disabled={Boolean(feedback)}
                      onChange={() => setAnswer(String(index))}
                    />
                    <span lang={optionLang(question.kind, lang, settings.readingLang)}>
                      {option}
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
        <Button type="submit" ref={submitRef}>
          {submitLabel}
        </Button>
        <p className="practice-keys-hint small muted">
          Bàn phím: {question.kind === "reading" ? "gõ cách đọc" : "phím 1–4 để chọn"}, Enter để
          kiểm tra và sang câu tiếp.
        </p>
      </form>
    </div>
  );
}
