import type { PublicLesson } from "@/lib/lesson-schema";

// One grammar point as the lookup shows it: only what the page draws and searches, so a reader
// with many lessons does not receive every slide and question.
export interface GrammarEntry {
  key: string;
  pattern: string;
  vi: string;
  explain: string;
  lessonTitle: string;
  href: string;
}

export interface GrammarSource {
  lesson: PublicLesson;
  // A class's lesson: the link keeps the class so the reader opens the version it pins.
  classId?: string;
}

// The first source of a lesson wins, so a class's pinned version is not listed twice beside the
// newest one; sources come in the order they should be shown.
export function toGrammarEntries(sources: readonly GrammarSource[]): GrammarEntry[] {
  const seen = new Set<string>();
  return sources.flatMap(({ lesson, classId }) => {
    if (seen.has(lesson.lessonId)) {
      return [];
    }
    seen.add(lesson.lessonId);
    const query = `version=${lesson.id}${classId ? `&class=${classId}` : ""}`;
    return lesson.content.grammar.map((grammar) => ({
      key: `${lesson.id}:${grammar.id}`,
      pattern: grammar.pattern,
      vi: grammar.vi,
      explain: grammar.explain,
      lessonTitle: lesson.title,
      href: `/lessons/${lesson.lessonId}?${query}#${grammar.id}`,
    }));
  });
}
