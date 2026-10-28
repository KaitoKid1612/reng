"use client";

import { useEffect, useRef, useState } from "react";

import { SlideContent } from "@/components/slides/slide-content";
import { toPublicLesson } from "@/lib/lesson-schema";

import type { LessonDraftState } from "@/lib/lesson-draft";

interface SlidePreviewProps {
  lessonId: string;
  draft: LessonDraftState;
  slideId: string | null;
}

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

function hasRenderableImage(source: string) {
  const value = source.trim();
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

// Uses the same slide components as the classroom deck, frozen (no answer requests) and
// scaled from the fixed 1280×720 canvas so the preview matches the projector.
export function SlidePreview({ lessonId, draft, slideId }: SlidePreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / SLIDE_WIDTH);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const lesson = toPublicLesson({
    id: "preview",
    lessonId,
    versionNo: 1,
    publishedAt: new Date(0).toISOString(),
    title: draft.metadata.title,
    titleJa: draft.metadata.titleJa,
    summary: draft.metadata.summary,
    order: draft.metadata.order,
    courseId: draft.metadata.courseId,
    isSample: false,
    content: draft.content,
  });
  const slide = lesson.content.slides.find((item) => item.id === slideId);
  let body = <p className="muted">Chọn hoặc thêm một slide để xem trước.</p>;
  if (slide?.type === "image" && !hasRenderableImage(slide.src)) {
    body = <p className="muted">Nhập đường dẫn ảnh /… hoặc https://… để xem trước.</p>;
  } else if (slide) {
    body = <SlideContent slide={slide} lesson={lesson} staticMode />;
  }
  return (
    <div
      ref={frameRef}
      className="slide-preview"
      style={{ height: SLIDE_HEIGHT * scale }}
      aria-label="Xem trước slide"
    >
      <div className="slide-page slide-preview-canvas" style={{ transform: `scale(${scale})` }}>
        {body}
      </div>
    </div>
  );
}
