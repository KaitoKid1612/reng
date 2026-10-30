import { isTeachingLanguage } from "@/lib/teaching-language";

import type { TeachingLanguageTag } from "@/lib/teaching-language";

export interface LessonFilters {
  query: string;
  language: TeachingLanguageTag | "all";
  status: "all" | "draft" | "published";
}

interface ManagedLesson {
  title: string;
  languageTag: TeachingLanguageTag | null;
  publishedVersionId: string | null;
}

export function parseLessonFilters(query: {
  q?: unknown;
  language?: unknown;
  status?: unknown;
}): LessonFilters {
  return {
    query: typeof query.q === "string" ? query.q.trim().slice(0, 160) : "",
    language:
      typeof query.language === "string" && isTeachingLanguage(query.language)
        ? query.language
        : "all",
    status: query.status === "draft" || query.status === "published" ? query.status : "all",
  };
}

export function filterManagedLessons<T extends ManagedLesson>(
  lessons: readonly T[],
  filters: LessonFilters,
): T[] {
  const search = filters.query.normalize("NFKC").toLocaleLowerCase("vi");
  return lessons.filter((lesson) => {
    if (filters.language !== "all" && lesson.languageTag !== filters.language) {
      return false;
    }
    if (filters.status === "draft" && lesson.publishedVersionId !== null) {
      return false;
    }
    if (filters.status === "published" && lesson.publishedVersionId === null) {
      return false;
    }
    return lesson.title.normalize("NFKC").toLocaleLowerCase("vi").includes(search);
  });
}
