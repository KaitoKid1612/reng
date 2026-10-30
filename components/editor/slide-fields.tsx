"use client";

import { useState } from "react";

import { FURIGANA_HINT, SLIDE_TYPE_LABELS } from "@/components/editor/slide-labels";
import { Button } from "@/components/ui/button";
import { toPlainJapanese } from "@/lib/japanese-text";
import { isQuizQuestion } from "@/lib/lesson-draft";
import { MAX_DIALOGUE_LINES, MAX_TABLE_COLUMNS, MAX_TABLE_ROWS } from "@/lib/lesson-schema";
import { formatSlideTable, parseSlideTable } from "@/lib/slide-table";

import type { DraftContent, DraftSlide } from "@/lib/lesson-draft";

interface SlideFieldsProps {
  slide: DraftSlide;
  position: number;
  content: DraftContent;
  onChange: (slide: DraftSlide) => void;
  onRemove: () => void;
}

type DialogueSlide = Extract<DraftSlide, { type: "dialogue" }>;
type TableSlide = Extract<DraftSlide, { type: "table" }>;

interface DialogueFieldsProps {
  slide: DialogueSlide;
  onChange: (slide: DraftSlide) => void;
}

interface TableFieldsProps {
  slide: TableSlide;
  onChange: (slide: DraftSlide) => void;
}

const MAX_VOCAB_PER_SLIDE = 8;

function DialogueFields({ slide, onChange }: DialogueFieldsProps) {
  const id = `slide-${slide.id}`;

  function handleLineChange(index: number, patch: Partial<DialogueSlide["lines"][number]>) {
    onChange({
      ...slide,
      lines: slide.lines.map((line, position) =>
        position === index ? { ...line, ...patch } : line,
      ),
    });
  }

  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-title`}>Tiêu đề hội thoại</label>
        <input
          id={`${id}-title`}
          maxLength={200}
          placeholder="Hội thoại: ở bưu điện"
          value={slide.title}
          onChange={(event) => onChange({ ...slide, title: event.target.value })}
        />
      </div>
      <fieldset>
        <legend>Lượt thoại (tối đa {MAX_DIALOGUE_LINES})</legend>
        <p className="small muted">{FURIGANA_HINT}</p>
        {slide.lines.map((line, index) => (
          <div key={index} className="dialogue-line-fields">
            <input
              aria-label={`Người nói lượt ${index + 1}`}
              maxLength={40}
              value={line.speaker}
              onChange={(event) => handleLineChange(index, { speaker: event.target.value })}
            />
            <input
              aria-label={`Câu tiếng Nhật lượt ${index + 1}`}
              lang="ja"
              maxLength={300}
              value={line.jp}
              onChange={(event) => handleLineChange(index, { jp: event.target.value })}
            />
            <input
              aria-label={`Nghĩa tiếng Việt lượt ${index + 1}`}
              maxLength={300}
              value={line.vi}
              onChange={(event) => handleLineChange(index, { vi: event.target.value })}
            />
            <Button
              variant="ghost"
              aria-label={`Xóa lượt ${index + 1}`}
              onClick={() =>
                onChange({
                  ...slide,
                  lines: slide.lines.filter((_line, position) => position !== index),
                })
              }
            >
              Xóa
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          disabled={slide.lines.length >= MAX_DIALOGUE_LINES}
          onClick={() =>
            onChange({ ...slide, lines: [...slide.lines, { speaker: "", jp: "", vi: "" }] })
          }
        >
          Thêm lượt thoại
        </Button>
      </fieldset>
      <label className="choice-label">
        <input
          type="checkbox"
          checked={slide.reveal}
          onChange={(event) => onChange({ ...slide, reveal: event.target.checked })}
        />
        Ẩn nghĩa tiếng Việt, bấm mũi tên mới hiện từng lượt
      </label>
    </>
  );
}

// The textarea keeps the teacher's own text; only a table within the limits reaches the draft.
function TableFields({ slide, onChange }: TableFieldsProps) {
  const id = `slide-${slide.id}`;
  const [text, setText] = useState(() => formatSlideTable(slide));
  const [error, setError] = useState("");

  function handleTextChange(value: string) {
    setText(value);
    const result = parseSlideTable(value);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError("");
    onChange({ ...slide, ...result.table });
  }

  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-title`}>Tiêu đề bảng</label>
        <input
          id={`${id}-title`}
          maxLength={200}
          placeholder="Bảng đếm: 〜つ・〜人・〜枚"
          value={slide.title}
          onChange={(event) => onChange({ ...slide, title: event.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-cells`}>Nội dung bảng</label>
        <textarea
          id={`${id}-cells`}
          className="table-input"
          rows={8}
          value={text}
          aria-describedby={`${id}-cells-hint`}
          onChange={(event) => handleTextChange(event.target.value)}
        />
        <p id={`${id}-cells-hint`} className="small muted">
          Dán từ Excel/Google Sheets hoặc gõ các ô cách nhau bằng dấu |. Dòng đầu là tiêu đề cột,
          mỗi dòng sau là một hàng; tối đa {MAX_TABLE_COLUMNS} cột, {MAX_TABLE_ROWS} hàng.{" "}
          {FURIGANA_HINT}
        </p>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
      </div>
      <label className="choice-label">
        <input
          type="checkbox"
          checked={slide.revealLastColumn}
          onChange={(event) => onChange({ ...slide, revealLastColumn: event.target.checked })}
        />
        Luyện thay thế: ẩn cột cuối, bấm mũi tên hiện câu mẫu từng hàng
      </label>
    </>
  );
}

function TypeFields({ slide, content, onChange }: Omit<SlideFieldsProps, "position" | "onRemove">) {
  const id = `slide-${slide.id}`;
  switch (slide.type) {
    case "title":
      return (
        <>
          <div className="field">
            <label htmlFor={`${id}-jp`}>Dòng tiếng Nhật</label>
            <input
              id={`${id}-jp`}
              lang="ja"
              maxLength={200}
              value={slide.jp}
              aria-describedby={`${id}-jp-hint`}
              onChange={(event) => onChange({ ...slide, jp: event.target.value })}
            />
            <p id={`${id}-jp-hint`} className="small muted">
              {FURIGANA_HINT}
            </p>
          </div>
          <div className="field">
            <label htmlFor={`${id}-vi`}>Dòng tiếng Việt</label>
            <input
              id={`${id}-vi`}
              maxLength={200}
              value={slide.vi}
              onChange={(event) => onChange({ ...slide, vi: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={`${id}-image`}>Hình mở đầu (/… hoặc https://…, tùy chọn)</label>
            <input
              id={`${id}-image`}
              maxLength={500}
              value={slide.image ?? ""}
              onChange={(event) => onChange({ ...slide, image: event.target.value })}
            />
          </div>
        </>
      );
    case "vocab":
      return (
        <fieldset>
          <legend>Từ vựng trên slide (tối đa {MAX_VOCAB_PER_SLIDE})</legend>
          {content.vocab.length === 0 && <p className="muted">Thêm từ vựng ở mục Từ vựng trước.</p>}
          <div className="choice-list">
            {content.vocab.map((item) => {
              const isChecked = slide.refs.includes(item.id);
              return (
                <label key={item.id} className="choice-label">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!isChecked && slide.refs.length >= MAX_VOCAB_PER_SLIDE}
                    onChange={() =>
                      onChange({
                        ...slide,
                        refs: isChecked
                          ? slide.refs.filter((ref) => ref !== item.id)
                          : content.vocab
                              .map((entry) => entry.id)
                              .filter((ref) => ref === item.id || slide.refs.includes(ref)),
                      })
                    }
                  />
                  <span lang="ja">{item.kanji || item.jp || "(chưa nhập)"}</span>
                  <span className="small muted">{item.vi}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    case "grammar":
    case "example":
      return (
        <>
          <div className="field">
            <label htmlFor={`${id}-grammar`}>Mẫu câu</label>
            <select
              id={`${id}-grammar`}
              value={slide.ref}
              onChange={(event) => onChange({ ...slide, ref: event.target.value })}
            >
              <option value="">Chọn mẫu câu</option>
              {content.grammar.map((item) => (
                <option key={item.id} value={item.id}>
                  {toPlainJapanese(item.pattern) || "(chưa nhập mẫu)"}
                </option>
              ))}
            </select>
          </div>
          {slide.type === "example" && (
            <label className="choice-label">
              <input
                type="checkbox"
                checked={slide.reveal}
                onChange={(event) => onChange({ ...slide, reveal: event.target.checked })}
              />
              Ẩn nghĩa tiếng Việt, bấm mũi tên mới hiện (để hỏi cả lớp trước)
            </label>
          )}
        </>
      );
    case "quiz":
      return (
        <div className="field">
          <label htmlFor={`${id}-question`}>Câu luyện</label>
          <select
            id={`${id}-question`}
            value={slide.ref}
            onChange={(event) => onChange({ ...slide, ref: event.target.value })}
          >
            <option value="">Chọn câu luyện</option>
            {content.questions.filter(isQuizQuestion).map((item) => (
              <option key={item.id} value={item.id}>
                {item.prompt || "(chưa nhập đề)"}
              </option>
            ))}
          </select>
        </div>
      );
    case "note":
      return (
        <>
          <div className="field">
            <label htmlFor={`${id}-title`}>Tiêu đề ghi chú</label>
            <input
              id={`${id}-title`}
              maxLength={200}
              value={slide.title}
              onChange={(event) => onChange({ ...slide, title: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={`${id}-body`}>Nội dung (học viên thấy)</label>
            <textarea
              id={`${id}-body`}
              maxLength={2000}
              value={slide.body}
              onChange={(event) => onChange({ ...slide, body: event.target.value })}
            />
          </div>
        </>
      );
    case "image":
      return (
        <>
          <div className="field">
            <label htmlFor={`${id}-src`}>Đường dẫn ảnh (/… hoặc https://…)</label>
            <input
              id={`${id}-src`}
              maxLength={500}
              value={slide.src}
              onChange={(event) => onChange({ ...slide, src: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={`${id}-alt`}>Mô tả ảnh</label>
            <input
              id={`${id}-alt`}
              maxLength={300}
              value={slide.alt}
              onChange={(event) => onChange({ ...slide, alt: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={`${id}-caption`}>Chú thích (tùy chọn)</label>
            <input
              id={`${id}-caption`}
              maxLength={300}
              value={slide.caption ?? ""}
              onChange={(event) => onChange({ ...slide, caption: event.target.value })}
            />
          </div>
        </>
      );
    case "dialogue":
      return <DialogueFields slide={slide} onChange={onChange} />;
    case "table":
      return <TableFields key={slide.id} slide={slide} onChange={onChange} />;
  }
}

export function SlideFields({ slide, position, content, onChange, onRemove }: SlideFieldsProps) {
  return (
    <div className="form-card slide-fields">
      <h3>
        Slide {position}: {SLIDE_TYPE_LABELS[slide.type]}
      </h3>
      <TypeFields slide={slide} content={content} onChange={onChange} />
      <div className="field">
        <label htmlFor={`slide-${slide.id}-notes`}>Ghi chú giảng viên (chỉ hiện ở presenter)</label>
        <textarea
          id={`slide-${slide.id}-notes`}
          maxLength={2000}
          value={slide.teacherNotes ?? ""}
          onChange={(event) => onChange({ ...slide, teacherNotes: event.target.value })}
        />
      </div>
      <Button variant="ghost" onClick={onRemove}>
        Xóa slide này
      </Button>
    </div>
  );
}
