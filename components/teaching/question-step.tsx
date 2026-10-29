"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  buildVocabularyQuestion,
  createBlankQuestion,
  isQuestionReviewed,
  pickOption,
  QUESTION_KIND_LABELS,
} from "@/lib/teaching-draft";

import type { TeachingDraft, TeachingDraftQuestion } from "@/lib/teaching-content";
import type { QuestionKind, ReviewedQuestions, TeachingDispatch } from "@/lib/teaching-draft";

const QUESTION_KINDS = ["meaning", "hanzi", "pinyin"] as const;
const INPUT_MODES = ["chinese", "pinyin"] as const;
const MAX_OPTIONS = 6;

interface QuestionEditorProps {
  question: TeachingDraftQuestion;
  label: string;
  isReviewed: boolean;
  isBusy: boolean;
  onChange: (question: TeachingDraftQuestion) => void;
  onConfirm: () => void;
}

function QuestionEditor({
  question,
  label,
  isReviewed,
  isBusy,
  onChange,
  onConfirm,
}: QuestionEditorProps) {
  function handleInputMode(value: string) {
    const inputMode = pickOption(INPUT_MODES, value);
    if (question.type === "fill" && inputMode) {
      onChange({ ...question, inputMode });
    }
  }

  return (
    <>
      <p>
        <span className={`status-badge ${isReviewed ? "status-correct" : "status-attention"}`}>
          {isReviewed ? "Đã xác nhận đáp án" : "Chưa xác nhận đáp án"}
        </span>
      </p>
      <div className="field">
        <label htmlFor={`${question.id}-prompt`}>Đề bài {label}</label>
        <textarea
          id={`${question.id}-prompt`}
          value={question.prompt}
          maxLength={500}
          onChange={(event) => onChange({ ...question, prompt: event.target.value })}
        />
      </div>
      {question.type === "choice" ? (
        <fieldset className="teaching-fieldset">
          <legend>Lựa chọn của {label} (chọn một đáp án đúng)</legend>
          {question.options.map((option, index) => (
            <div key={index} className="teaching-inline-row">
              <input
                type="radio"
                name={`${question.id}-answer`}
                aria-label={`Đáp án đúng là lựa chọn ${index + 1} của ${label}`}
                checked={question.answer[0] === index}
                onChange={() => onChange({ ...question, answer: [index] })}
              />
              <input
                aria-label={`Lựa chọn ${index + 1} của ${label}`}
                value={option}
                maxLength={120}
                onChange={(event) =>
                  onChange({
                    ...question,
                    options: question.options.map((item, position) =>
                      position === index ? event.target.value : item,
                    ),
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                aria-label={`Xóa lựa chọn ${index + 1} của ${label}`}
                disabled={question.options.length <= 2}
                onClick={() =>
                  onChange({
                    ...question,
                    options: question.options.filter((_item, position) => position !== index),
                    answer: question.answer
                      .filter((answer) => answer !== index)
                      .map((answer) => (answer > index ? answer - 1 : answer)),
                  })
                }
              >
                Xóa
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={question.options.length >= MAX_OPTIONS}
            onClick={() => onChange({ ...question, options: [...question.options, ""] })}
          >
            Thêm lựa chọn
          </Button>
        </fieldset>
      ) : (
        <fieldset className="teaching-fieldset">
          <legend>Đáp án được chấp nhận của {label}</legend>
          <div className="field">
            <label htmlFor={`${question.id}-mode`}>Học viên nhập</label>
            <select
              id={`${question.id}-mode`}
              value={question.inputMode}
              onChange={(event) => handleInputMode(event.target.value)}
            >
              <option value="chinese">Chữ Hán (bộ gõ tiếng Trung)</option>
              <option value="pinyin">Pinyin có dấu thanh</option>
            </select>
          </div>
          {question.answer.map((answer, index) => (
            <div key={index} className="teaching-inline-row">
              <input
                aria-label={`Đáp án ${index + 1} của ${label}`}
                value={answer}
                maxLength={200}
                onChange={(event) =>
                  onChange({
                    ...question,
                    answer: question.answer.map((item, position) =>
                      position === index ? event.target.value : item,
                    ),
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                aria-label={`Xóa đáp án ${index + 1} của ${label}`}
                disabled={question.answer.length <= 1}
                onClick={() =>
                  onChange({
                    ...question,
                    answer: question.answer.filter((_item, position) => position !== index),
                  })
                }
              >
                Xóa
              </Button>
            </div>
          ))}
          <p className="small muted">
            Chấm khớp chính xác sau khi bỏ khoảng trắng đầu/cuối: giữ dấu thanh, giản/phồn thể và
            dấu câu. Thêm từng cách viết bạn chấp nhận.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={question.answer.length >= 10}
            onClick={() => onChange({ ...question, answer: [...question.answer, ""] })}
          >
            Thêm đáp án
          </Button>
        </fieldset>
      )}
      <div className="field">
        <label htmlFor={`${question.id}-explain`}>Giải thích {label}</label>
        <textarea
          id={`${question.id}-explain`}
          value={question.explain}
          maxLength={1000}
          onChange={(event) => onChange({ ...question, explain: event.target.value })}
        />
      </div>
      <Button type="button" disabled={isReviewed || isBusy} onClick={onConfirm}>
        Lưu và xác nhận đáp án {label}
      </Button>
    </>
  );
}

interface QuestionStepProps {
  draft: TeachingDraft;
  dispatch: TeachingDispatch;
  reviewed: ReviewedQuestions;
  isBusy: boolean;
  onConfirm: (questionId: string) => void;
}

export function QuestionStep({ draft, dispatch, reviewed, isBusy, onConfirm }: QuestionStepProps) {
  const { vocab, questions } = draft.content;
  const words = vocab.filter((item) => item.text && item.meaning);
  const [vocabId, setVocabId] = useState("");
  const [kind, setKind] = useState<QuestionKind>("meaning");
  const [message, setMessage] = useState("");
  const selectedId = words.some((item) => item.id === vocabId) ? vocabId : (words[0]?.id ?? "");

  function handleGenerate() {
    const question = buildVocabularyQuestion(draft.content, selectedId, kind);
    if (!question) {
      setMessage("Từ này cần chữ Hán, nghĩa và pinyin (với câu pinyin) để tạo câu.");
      return;
    }
    dispatch({ type: "addQuestion", question });
    setMessage("Đã thêm khung câu. Kiểm tra đề, đáp án rồi xác nhận.");
  }

  function handleKindChange(value: string) {
    const nextKind = pickOption(QUESTION_KINDS, value);
    if (nextKind) {
      setKind(nextKind);
    }
  }

  return (
    <section className="editor-section" aria-labelledby="question-step-title">
      <h2 id="question-step-title">Câu luyện</h2>
      <p className="small muted">
        Hệ thống chỉ tạo khung câu từ từ vựng; bạn kiểm tra và xác nhận từng đáp án. Sửa câu sau khi
        xác nhận sẽ cần xác nhận lại.
      </p>
      {words.length > 0 && (
        <div className="form-card">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="question-source">Tạo từ từ vựng</label>
              <select
                id="question-source"
                value={selectedId}
                onChange={(event) => setVocabId(event.target.value)}
              >
                {words.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.text} – {item.meaning}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="question-kind">Dạng câu</label>
              <select
                id="question-kind"
                value={kind}
                onChange={(event) => handleKindChange(event.target.value)}
              >
                {QUESTION_KINDS.map((item) => (
                  <option key={item} value={item}>
                    {QUESTION_KIND_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={handleGenerate}>
            Tạo khung câu
          </Button>
          {message && (
            <p role="status" className="small">
              {message}
            </p>
          )}
        </div>
      )}
      <ol className="teaching-items">
        {questions.map((question, index) => {
          const label = `câu ${index + 1}`;
          return (
            <li key={question.id} className="teaching-item">
              <QuestionEditor
                question={question}
                label={label}
                isReviewed={isQuestionReviewed(question, reviewed)}
                isBusy={isBusy}
                onChange={(next) => dispatch({ type: "updateQuestion", question: next })}
                onConfirm={() => onConfirm(question.id)}
              />
              <div className="button-row">
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Đưa ${label} lên`}
                  disabled={index === 0}
                  onClick={() =>
                    dispatch({
                      type: "moveItem",
                      collection: "questions",
                      id: question.id,
                      offset: -1,
                    })
                  }
                >
                  Lên
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Xóa ${label}`}
                  onClick={() =>
                    dispatch({ type: "removeItem", collection: "questions", id: question.id })
                  }
                >
                  Xóa
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="button-row">
        <Button
          type="button"
          variant="outline"
          disabled={questions.length >= 100}
          onClick={() =>
            dispatch({
              type: "addQuestion",
              question: createBlankQuestion(draft.content, "choice"),
            })
          }
        >
          Thêm câu trắc nghiệm
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={questions.length >= 100}
          onClick={() =>
            dispatch({ type: "addQuestion", question: createBlankQuestion(draft.content, "fill") })
          }
        >
          Thêm câu điền
        </Button>
      </div>
    </section>
  );
}
