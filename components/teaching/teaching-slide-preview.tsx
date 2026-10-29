"use client";

import { useEffect, useRef, useState } from "react";

import { TeachingSlideContent } from "@/components/teaching/teaching-slide-content";

import type { PublicTeachingLesson } from "@/lib/teaching-content";

interface TeachingSlidePreviewProps {
  lesson: PublicTeachingLesson;
  slideId: string | null;
}

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

// Same renderer as the classroom deck on the fixed 1280×720 canvas, frozen and scaled.
export function TeachingSlidePreview({ lesson, slideId }: TeachingSlidePreviewProps) {
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

  const slide = lesson.content.slides.find((item) => item.id === slideId);
  return (
    <div
      ref={frameRef}
      className="slide-preview"
      style={{ height: SLIDE_HEIGHT * scale }}
      aria-label="Xem trước slide"
    >
      <div className="slide-page slide-preview-canvas" style={{ transform: `scale(${scale})` }}>
        {slide ? (
          <TeachingSlideContent slide={slide} lesson={lesson} staticMode />
        ) : (
          <p className="muted">Chọn một slide để xem trước.</p>
        )}
      </div>
    </div>
  );
}
