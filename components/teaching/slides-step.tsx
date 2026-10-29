"use client";

import { useState } from "react";

import { TeachingSlidePreview } from "@/components/teaching/teaching-slide-preview";
import { Button } from "@/components/ui/button";
import { countEditedGeneratedSlides, toPreviewLesson } from "@/lib/teaching-draft";
import { generateTeachingSlides, hasSlideChanges } from "@/lib/teaching-templates";

import type { TeachingDraft, TeachingSlide } from "@/lib/teaching-content";
import type { TeachingDispatch } from "@/lib/teaching-draft";
import type { SlideGeneration } from "@/lib/teaching-templates";

const SLIDE_TYPE_LABELS: Record<TeachingSlide["type"], string> = {
  title: "Tiêu đề",
  note: "Ghi chú",
  vocab: "Từ vựng",
  examples: "Câu ví dụ",
  grammar: "Mẫu câu",
  dialogue: "Hội thoại",
  quiz: "Câu luyện",
};

function describeSlide(slide: TeachingSlide, draft: TeachingDraft) {
  const { content } = draft;
  switch (slide.type) {
    case "title":
      return slide.text;
    case "note":
      return slide.title;
    case "vocab":
      return slide.refs
        .map((id) => content.vocab.find((item) => item.id === id)?.text ?? "?")
        .join(", ");
    case "examples":
      return (
        content.vocab.find((item) => item.id === slide.ref)?.examples[slide.index]?.text ?? "?"
      );
    case "grammar":
      return content.grammar.find((item) => item.id === slide.ref)?.pattern ?? "?";
    case "dialogue":
      return `${slide.refs.length} lượt thoại`;
    case "quiz":
      return content.questions.find((item) => item.id === slide.ref)?.prompt ?? "?";
  }
}

interface SlideFieldsProps {
  slide: TeachingSlide;
  dispatch: TeachingDispatch;
}

function SlideFields({ slide, dispatch }: SlideFieldsProps) {
  return (
    <div className="form-card">
      {slide.type === "title" && (
        <div className="field">
          <label htmlFor={`${slide.id}-text`}>Chữ trên slide tiêu đề</label>
          <input
            id={`${slide.id}-text`}
            value={slide.text}
            maxLength={200}
            onChange={(event) =>
              dispatch({ type: "updateSlide", slide: { ...slide, text: event.target.value } })
            }
          />
        </div>
      )}
      {slide.type === "note" && (
        <>
          <div className="field">
            <label htmlFor={`${slide.id}-title`}>Tiêu đề slide</label>
            <input
              id={`${slide.id}-title`}
              value={slide.title}
              maxLength={100}
              onChange={(event) =>
                dispatch({ type: "updateSlide", slide: { ...slide, title: event.target.value } })
              }
            />
          </div>
          <div className="field">
            <label htmlFor={`${slide.id}-body`}>Nội dung slide</label>
            <textarea
              id={`${slide.id}-body`}
              value={slide.body}
              maxLength={1000}
              onChange={(event) =>
                dispatch({ type: "updateSlide", slide: { ...slide, body: event.target.value } })
              }
            />
          </div>
        </>
      )}
      <div className="field">
        <label htmlFor={`${slide.id}-notes`}>Ghi chú riêng của giáo viên</label>
        <textarea
          id={`${slide.id}-notes`}
          value={slide.teacherNotes ?? ""}
          maxLength={2000}
          onChange={(event) =>
            dispatch({
              type: "updateSlide",
              slide: { ...slide, teacherNotes: event.target.value || undefined },
            })
          }
        />
        <p className="small muted">Chỉ hiện ở cửa sổ presenter của bạn, học viên không thấy.</p>
      </div>
    </div>
  );
}

interface SlidesStepProps {
  draft: TeachingDraft;
  dispatch: TeachingDispatch;
  lessonId: string;
}

export function SlidesStep({ draft, dispatch, lessonId }: SlidesStepProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replaceEdited, setReplaceEdited] = useState(false);
  const [generation, setGeneration] = useState<SlideGeneration | null>(null);
  const { slides } = draft.content;
  const selected = slides.find((slide) => slide.id === selectedId) ?? slides[0] ?? null;
  const editedCount = countEditedGeneratedSlides(draft);

  function handlePlan() {
    setGeneration(generateTeachingSlides(draft, replaceEdited));
  }

  function handleApply() {
    if (generation) {
      dispatch({ type: "applySlides", generation });
      setGeneration(null);
    }
  }

  return (
    <section className="editor-section" aria-labelledby="slides-step-title">
      <h2 id="slides-step-title">Slide</h2>
      <div className="form-card">
        <p className="small muted">
          Dựng slide theo mẫu từ mục tiêu, từ vựng, mẫu câu, hội thoại và câu luyện. Dựng lại không
          nhân đôi slide; slide bạn đã sửa hoặc xóa được giữ nguyên.
        </p>
        {editedCount > 0 && (
          <label className="choice-label">
            <input
              type="checkbox"
              checked={replaceEdited}
              onChange={(event) => {
                setReplaceEdited(event.target.checked);
                setGeneration(null);
              }}
            />
            Sinh lại cả {editedCount} slide đã sửa tay và slide đã xóa
          </label>
        )}
        <Button type="button" variant="outline" onClick={handlePlan}>
          Dựng slide từ nội dung
        </Button>
        {generation && (
          <div role="status" className="notice-panel">
            {hasSlideChanges(generation.changes) ? (
              <p>
                Sẽ thêm {generation.changes.added.length}, cập nhật{" "}
                {generation.changes.updated.length}, bỏ {generation.changes.removed.length} slide;
                giữ nguyên {generation.changes.preserved.length} slide đã sửa tay.
              </p>
            ) : (
              <p>Slide đã khớp với nội dung, không có gì thay đổi.</p>
            )}
            <div className="button-row">
              {hasSlideChanges(generation.changes) && (
                <Button type="button" onClick={handleApply}>
                  Áp dụng thay đổi slide
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setGeneration(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </div>
      {slides.length > 0 && (
        <div className="editor-layout">
          <div>
            <ol className="slide-list">
              {slides.map((slide, index) => (
                <li
                  key={slide.id}
                  className="slide-list-item"
                  data-selected={slide.id === selected?.id}
                >
                  <button
                    type="button"
                    className="slide-list-select"
                    aria-label={`Chọn slide ${index + 1}`}
                    onClick={() => setSelectedId(slide.id)}
                  >
                    <strong>
                      {index + 1}. {SLIDE_TYPE_LABELS[slide.type]}
                    </strong>
                    <span>{describeSlide(slide, draft)}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Đưa slide ${index + 1} lên`}
                    disabled={index === 0}
                    onClick={() =>
                      dispatch({ type: "moveItem", collection: "slides", id: slide.id, offset: -1 })
                    }
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Đưa slide ${index + 1} xuống`}
                    disabled={index === slides.length - 1}
                    onClick={() =>
                      dispatch({ type: "moveItem", collection: "slides", id: slide.id, offset: 1 })
                    }
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Xóa slide ${index + 1}`}
                    onClick={() =>
                      dispatch({ type: "removeItem", collection: "slides", id: slide.id })
                    }
                  >
                    ×
                  </Button>
                </li>
              ))}
            </ol>
            <Button
              type="button"
              variant="outline"
              disabled={slides.length >= 200}
              onClick={() => dispatch({ type: "addNoteSlide" })}
            >
              Thêm slide ghi chú
            </Button>
          </div>
          <div>
            <TeachingSlidePreview
              lesson={toPreviewLesson(draft, lessonId)}
              slideId={selected?.id ?? null}
            />
            {selected && <SlideFields slide={selected} dispatch={dispatch} />}
          </div>
        </div>
      )}
    </section>
  );
}
