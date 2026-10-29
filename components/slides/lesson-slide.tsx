import { SlideContent } from "@/components/slides/slide-content";
import { TeachingSlideContent } from "@/components/teaching/teaching-slide-content";
import { isPublicTeachingLesson } from "@/lib/teaching-content";

import type { PublicAnyLesson } from "@/lib/teaching-content";

interface LessonSlideProps {
  lesson: PublicAnyLesson;
  index: number;
  staticMode?: boolean;
}

// Chooses the renderer for the lesson's schema; Japanese v1 slides keep their own renderer.
export function LessonSlide({ lesson, index, staticMode }: LessonSlideProps) {
  if (isPublicTeachingLesson(lesson)) {
    const slide = lesson.content.slides[index];
    return slide ? (
      <TeachingSlideContent slide={slide} lesson={lesson} staticMode={staticMode} />
    ) : null;
  }
  const slide = lesson.content.slides[index];
  return slide ? <SlideContent slide={slide} lesson={lesson} staticMode={staticMode} /> : null;
}

export function listSlideIds(lesson: PublicAnyLesson): string[] {
  return isPublicTeachingLesson(lesson)
    ? lesson.content.slides.map((slide) => slide.id)
    : lesson.content.slides.map((slide) => slide.id);
}
