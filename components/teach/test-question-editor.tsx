"use client";

import { Button } from "@/components/ui/button";
import { INPUT_MODES } from "@/lib/assignment";
import { describeQuestionProblem } from "@/lib/test-question-draft";

import type { InputMode } from "@/lib/assignment";
import type { TeachingLanguageTag } from "@/lib/teaching-language";
import type { TestQuestionDraft } from "@/lib/test-question-draft";

interface TestQuestionEditorProps {
  draft: TestQuestionDraft;
  languageTag?: TeachingLanguageTag;
  position: number;
  showProblems: boolean;
  removeBlockedReason?: string;
  onChange: (draft: TestQuestionDraft) => void;
  onRemove: () => void;
}

const INPUT_MODE_LABELS: Record<InputMode, string> = {
  text: "Văn bản (tiếng Việt, không đổi sang kana)",
  chinese: "Chữ Hán (IME tiếng Trung)",
  pinyin: "Pinyin có dấu thanh",
  hiragana: "Hiragana",
  katakana: "Katakana",
  japanese: "Tiếng Nhật tự do (kanji, IME)",
};

export function TestQuestionEditor({
  draft,
  languageTag = "ja-JP",
  position,
  showProblems,
  removeBlockedReason,
  onChange,
  onRemove,
}: TestQuestionEditorProps) {
  const isJapanese = languageTag === "ja-JP";
  const isJapaneseInput =
    draft.type === "fill"
      ? draft.inputMode !== "chinese" && draft.inputMode !== "pinyin" && draft.inputMode !== "text"
      : isJapanese;
  const contentLang = isJapanese ? "ja" : "vi";
  let answerLang = "ja";
  if (draft.type === "fill" && !isJapaneseInput) {
    answerLang = languageTag === "zh-Hant" ? "zh-Hant" : "zh-Hans";
    if (draft.inputMode === "pinyin") {
      answerLang = "zh-Latn";
    }
    if (draft.inputMode === "text") {
      answerLang = "vi";
    }
  }
  let answerHint = "Khai báo đủ dạng kanji và kana nếu đều đúng, ví dụ 行きます và いきます.";
  if (!isJapaneseInput) {
    answerHint =
      "Chữ Hán phân biệt giản thể/phồn thể; pinyin cần đúng dấu thanh và khoảng trắng. Mỗi dạng được chấp nhận phải ghi thành một dòng riêng.";
  }
  if (draft.type === "fill" && draft.inputMode === "text") {
    answerHint = "Khai báo mỗi cách diễn đạt được chấp nhận trên một dòng; giữ dấu tiếng Việt.";
  }
  const id = `test-question-${draft.key}`;
  const problem = showProblems ? describeQuestionProblem(draft) : null;
  return (
    <fieldset className="question-card">
      <legend className="question-meta">
        Câu {position}: {draft.type === "choice" ? "trắc nghiệm" : "điền từ"}
      </legend>
      <div className="field">
        <label htmlFor={`${id}-prompt`}>Đề bài</label>
        <textarea
          id={`${id}-prompt`}
          lang={contentLang}
          maxLength={500}
          value={draft.prompt}
          onChange={(event) => onChange({ ...draft, prompt: event.target.value })}
        />
      </div>
      {draft.type === "choice" ? (
        <>
          <p className="small muted">Đánh dấu ô bên cạnh các lựa chọn đúng.</p>
          {draft.options.map((option, index) => (
            <div key={index} className="choice-option">
              <input
                type="checkbox"
                aria-label={`Lựa chọn ${index + 1} là đáp án đúng`}
                checked={draft.answer.includes(index)}
                onChange={() =>
                  onChange({
                    ...draft,
                    answer: draft.answer.includes(index)
                      ? draft.answer.filter((item) => item !== index)
                      : [...draft.answer, index].sort((first, second) => first - second),
                  })
                }
              />
              <input
                aria-label={`Nội dung lựa chọn ${index + 1}`}
                lang={contentLang}
                maxLength={120}
                value={option}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    options: draft.options.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item,
                    ),
                  })
                }
              />
            </div>
          ))}
          <div className="button-row">
            <Button
              variant="ghost"
              disabled={draft.options.length >= 6}
              onClick={() => onChange({ ...draft, options: [...draft.options, ""] })}
            >
              Thêm lựa chọn
            </Button>
            <Button
              variant="ghost"
              disabled={draft.options.length <= 2}
              onClick={() =>
                onChange({
                  ...draft,
                  options: draft.options.slice(0, -1),
                  answer: draft.answer.filter((index) => index < draft.options.length - 1),
                })
              }
            >
              Bớt lựa chọn cuối
            </Button>
          </div>
          <label className="choice-label">
            <input
              type="checkbox"
              checked={draft.multiple}
              onChange={(event) => onChange({ ...draft, multiple: event.target.checked })}
            />
            Có nhiều đáp án đúng
          </label>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor={`${id}-answers`}>Các đáp án được chấp nhận (mỗi dòng một đáp án)</label>
            <textarea
              id={`${id}-answers`}
              lang={answerLang}
              autoCapitalize="none"
              spellCheck={false}
              value={draft.acceptedText}
              onChange={(event) => onChange({ ...draft, acceptedText: event.target.value })}
              aria-describedby={`${id}-answers-hint`}
            />
            <p id={`${id}-answers-hint`} className="small muted">
              {answerHint}
            </p>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor={`${id}-mode`}>Ô nhập</label>
              <select
                id={`${id}-mode`}
                value={draft.inputMode}
                onChange={(event) => {
                  const inputMode = INPUT_MODES.find((mode) => mode === event.target.value);
                  if (inputMode) {
                    onChange({
                      ...draft,
                      inputMode,
                      kanjiStrict:
                        inputMode === "chinese" || inputMode === "pinyin" || inputMode === "text"
                          ? false
                          : draft.kanjiStrict,
                    });
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
            {(isJapaneseInput || draft.kanjiStrict) && (
              <label className="choice-label">
                <input
                  type="checkbox"
                  checked={draft.kanjiStrict}
                  onChange={(event) => onChange({ ...draft, kanjiStrict: event.target.checked })}
                />
                Bắt buộc viết kanji
              </label>
            )}
          </div>
        </>
      )}
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`${id}-explain`}>Giải thích đáp án</label>
          <textarea
            id={`${id}-explain`}
            maxLength={500}
            value={draft.explain}
            onChange={(event) => onChange({ ...draft, explain: event.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-points`}>Điểm</label>
          <input
            id={`${id}-points`}
            type="number"
            min={1}
            max={100}
            value={draft.points}
            onChange={(event) => onChange({ ...draft, points: Number(event.target.value) })}
          />
        </div>
      </div>
      {problem && (
        <p role="alert" className="error-text">
          {problem}
        </p>
      )}
      <Button variant="ghost" onClick={onRemove} disabled={Boolean(removeBlockedReason)}>
        Xóa câu này
      </Button>
      {removeBlockedReason && <p className="small muted">{removeBlockedReason}</p>}
    </fieldset>
  );
}
