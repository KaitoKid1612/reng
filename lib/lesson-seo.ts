import { absoluteUrl, SITE_NAME, toMetaDescription } from "@/lib/site";
import { isPublicTeachingLesson } from "@/lib/teaching-content";

import type { PublicAnyLesson } from "@/lib/teaching-content";

export function describeLessonForSearch(lesson: PublicAnyLesson) {
  if (isPublicTeachingLesson(lesson)) {
    const words = lesson.content.vocab
      .slice(0, 6)
      .map((item) => item.text)
      .join(", ");
    const goals = lesson.content.objectives.join("; ");
    return toMetaDescription(words ? `${goals}. Từ vựng: ${words}.` : goals);
  }
  return toMetaDescription(lesson.summary);
}

// schema.org LearningResource; only public lessons are reachable by crawlers.
export function lessonJsonLd(lesson: PublicAnyLesson) {
  const isChinese = isPublicTeachingLesson(lesson);
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: lesson.title,
    description: describeLessonForSearch(lesson),
    url: absoluteUrl(`/lessons/${lesson.lessonId}`),
    inLanguage: isChinese ? lesson.content.context.languageTag : "ja",
    learningResourceType: "Lesson",
    educationalLevel: "Beginner",
    isAccessibleForFree: true,
    datePublished: lesson.publishedAt,
    teaches: isChinese
      ? lesson.content.objectives
      : lesson.content.grammar.map((item) => item.pattern),
    provider: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
  };
}
