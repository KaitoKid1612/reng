"use client";

import { SLIDE_TYPE_LABELS } from "@/components/editor/slide-labels";
import { Button } from "@/components/ui/button";
import { isEditableQuestion } from "@/lib/lesson-draft";

import type { DraftContent, DraftSlide } from "@/lib/lesson-draft";

interface SlideFieldsProps {
  slide: DraftSlide;
  position: number;
  content: DraftContent;
  onChange: (slide: DraftSlide) => void;
  onRemove: () => void;
}

const MAX_VOCAB_PER_SLIDE = 8;

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
              onChange={(event) => onChange({ ...slide, jp: event.target.value })}
            />
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
                  {item.pattern || "(chưa nhập mẫu)"}
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
            {content.questions.filter(isEditableQuestion).map((item) => (
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
