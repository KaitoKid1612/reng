"use client";

import { Button } from "@/components/ui/button";
import { INPUT_MODES, MAX_RECORDED_LISTENS } from "@/lib/assignment";
import { AUDIO_COMMAND } from "@/lib/lesson-draft";

import type { InputMode } from "@/lib/assignment";
import type { DraftListeningQuestion } from "@/lib/lesson-draft";

interface ListeningQuestionEditorProps {
  question: DraftListeningQuestion;
  position: number;
  removeBlockedReason?: string;
  onChange: (question: DraftListeningQuestion) => void;
  onRemove: () => void;
}

const INPUT_MODE_LABELS: Record<InputMode, string> = {
  chinese: "Chữ Hán (IME tiếng Trung)",
  pinyin: "Pinyin có dấu thanh",
  hiragana: "Hiragana",
  katakana: "Katakana",
  japanese: "Tiếng Nhật tự do (kanji, IME)",
};

const MAX_OPTIONS = 6;

function clampPoints(value: number) {
  return Number.isInteger(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function parseMaxListens(value: string) {
  if (!value.trim()) {
    return null;
  }
  const count = Math.trunc(Number(value));
  return Number.isFinite(count) ? Math.max(1, Math.min(MAX_RECORDED_LISTENS, count)) : null;
}

// Blank lines stay while typing so authors can add answers; publishing drops them.
function toAnswerLines(answer: readonly (string | number)[]) {
  return answer.filter((item): item is string => typeof item === "string").join("\n");
}

export function ListeningQuestionEditor({
  question,
  position,
  removeBlockedReason,
  onChange,
  onRemove,
}: ListeningQuestionEditorProps) {
  const id = `listening-question-${question.id}`;
  const isChoice = question.type === "listen" && question.responseType === "choice";
  const options = question.type === "listen" ? (question.options ?? []) : [];
  const selected = question.answer.find((item) => typeof item === "number");

  function handleResponseType(responseType: "choice" | "fill") {
    if (question.type !== "listen" || question.responseType === responseType) {
      return;
    }
    onChange(
      responseType === "choice"
        ? { ...question, responseType, options: ["", ""], answer: [] }
        : { ...question, responseType, options: undefined, answer: [""] },
    );
  }

  function handleOptionChange(index: number, value: string) {
    if (question.type === "listen") {
      onChange({
        ...question,
        options: options.map((item, itemIndex) => (itemIndex === index ? value : item)),
      });
    }
  }

  function handleOptionCount(count: number) {
    if (question.type === "listen") {
      onChange({
        ...question,
        options: count > options.length ? [...options, ""] : options.slice(0, count),
        answer: selected !== undefined && selected < count ? [selected] : [],
      });
    }
  }

  return (
    <fieldset className="question-card">
      <legend className="question-meta">
        Câu {position}: {question.type === "listen" ? "nghe" : "chính tả"}
      </legend>
      <div className="field">
        <label htmlFor={`${id}-prompt`}>Đề bài</label>
        <textarea
          id={`${id}-prompt`}
          lang="ja"
          maxLength={500}
          value={question.prompt}
          onChange={(event) => onChange({ ...question, prompt: event.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-transcript`}>Transcript (máy đọc thành audio)</label>
        <textarea
          id={`${id}-transcript`}
          lang="ja"
          maxLength={500}
          value={question.transcript}
          onChange={(event) => onChange({ ...question, transcript: event.target.value })}
          aria-describedby={`${id}-audio`}
        />
        <p id={`${id}-audio`} className="small muted" data-testid="question-audio-status">
          {question.audio
            ? "Đã có audio. Sửa transcript thì cần tạo lại audio."
            : `Chưa có audio: lưu nháp rồi chạy ${AUDIO_COMMAND}. Học viên chỉ thấy transcript sau khi trả lời.`}
        </p>
      </div>
      {question.type === "listen" && (
        <fieldset>
          <legend>Cách trả lời</legend>
          <div className="option-row">
            {(["choice", "fill"] as const).map((item) => (
              <label key={item} className="choice-label">
                <input
                  type="radio"
                  name={`${id}-response`}
                  checked={question.responseType === item}
                  onChange={() => handleResponseType(item)}
                />
                {item === "choice" ? "Chọn một đáp án" : "Gõ đáp án"}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {isChoice ? (
        <>
          <p className="small muted">Chọn ô bên cạnh lựa chọn đúng.</p>
          {options.map((option, index) => (
            <div key={index} className="choice-option">
              <input
                type="radio"
                name={`${id}-answer`}
                aria-label={`Lựa chọn ${index + 1} là đáp án đúng`}
                checked={selected === index}
                onChange={() => onChange({ ...question, answer: [index] })}
              />
              <input
                aria-label={`Nội dung lựa chọn ${index + 1}`}
                lang="ja"
                maxLength={120}
                value={option}
                onChange={(event) => handleOptionChange(index, event.target.value)}
              />
            </div>
          ))}
          <div className="button-row">
            <Button
              variant="ghost"
              disabled={options.length >= MAX_OPTIONS}
              onClick={() => handleOptionCount(options.length + 1)}
            >
              Thêm lựa chọn
            </Button>
            <Button
              variant="ghost"
              disabled={options.length <= 2}
              onClick={() => handleOptionCount(options.length - 1)}
            >
              Bớt lựa chọn cuối
            </Button>
          </div>
        </>
      ) : (
        <div className="field">
          <label htmlFor={`${id}-answers`}>Các đáp án được chấp nhận (mỗi dòng một đáp án)</label>
          <textarea
            id={`${id}-answers`}
            lang="ja"
            value={toAnswerLines(question.answer)}
            onChange={(event) => onChange({ ...question, answer: event.target.value.split("\n") })}
            aria-describedby={`${id}-answers-hint`}
          />
          <p id={`${id}-answers-hint`} className="small muted">
            {question.type === "dictation"
              ? "Thường là chính transcript; khai báo thêm dạng kana nếu chấp nhận."
              : "Khai báo đủ dạng kanji và kana nếu đều đúng."}
          </p>
        </div>
      )}
      {question.type === "dictation" && (
        <div className="form-grid">
          <div className="field">
            <label htmlFor={`${id}-mode`}>Ô nhập</label>
            <select
              id={`${id}-mode`}
              value={question.inputMode}
              onChange={(event) => {
                const inputMode = INPUT_MODES.find((mode) => mode === event.target.value);
                if (inputMode) {
                  onChange({ ...question, inputMode });
                }
              }}
            >
              {INPUT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {INPUT_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </div>
          <label className="choice-label">
            <input
              type="checkbox"
              checked={question.kanjiStrict}
              onChange={(event) => onChange({ ...question, kanjiStrict: event.target.checked })}
            />
            Bắt buộc viết kanji
          </label>
        </div>
      )}
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`${id}-listens`}>Giới hạn lượt nghe</label>
          <input
            id={`${id}-listens`}
            type="number"
            min={1}
            max={MAX_RECORDED_LISTENS}
            placeholder="Không giới hạn"
            value={question.maxListens ?? ""}
            onChange={(event) =>
              onChange({ ...question, maxListens: parseMaxListens(event.target.value) })
            }
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-points`}>Điểm</label>
          <input
            id={`${id}-points`}
            type="number"
            min={1}
            max={100}
            value={question.points}
            onChange={(event) =>
              onChange({ ...question, points: clampPoints(Number(event.target.value)) })
            }
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${id}-explain`}>Giải thích đáp án</label>
        <textarea
          id={`${id}-explain`}
          maxLength={1000}
          value={question.explain}
          onChange={(event) => onChange({ ...question, explain: event.target.value })}
        />
      </div>
      <Button variant="ghost" onClick={onRemove} disabled={Boolean(removeBlockedReason)}>
        Xóa câu này
      </Button>
      {removeBlockedReason && <p className="small muted">{removeBlockedReason}</p>}
    </fieldset>
  );
}
