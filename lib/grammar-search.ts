import { compareLessons } from "@/lib/lesson-order";

import type { PublicLesson } from "@/lib/lesson-schema";

export interface GrammarExample {
  jp: string;
  vi: string;
  audio: string | null;
}

// One grammar point as the lookup shows it: only what the page draws and searches, so a reader
// with many lessons does not receive every slide and question.
export interface GrammarEntry {
  key: string;
  pattern: string;
  vi: string;
  explain: string;
  mistake: string | null;
  examples: GrammarExample[];
  lessonId: string;
  lessonTitle: string;
  href: string;
}

export interface GrammarSource {
  lesson: PublicLesson;
  // A class's lesson: the link keeps the class so the reader opens the version it pins.
  classId?: string;
}

// The first source of a lesson wins, so a class's pinned version is not listed twice beside the
// newest one. Lessons are then listed in teaching order (Minna lesson 1, 2…, then JLPT material),
// the order a learner meets them, whatever class they came from.
export function toGrammarEntries(sources: readonly GrammarSource[]): GrammarEntry[] {
  const seen = new Set<string>();
  const unique = sources.filter(({ lesson }) => {
    if (seen.has(lesson.lessonId)) {
      return false;
    }
    seen.add(lesson.lessonId);
    return true;
  });
  const ordered = unique
    .map((source, index) => ({ source, index }))
    .sort(
      (first, second) =>
        compareLessons(
          {
            courseId: first.source.lesson.courseId,
            orderNo: first.source.lesson.order,
            title: first.source.lesson.title,
          },
          {
            courseId: second.source.lesson.courseId,
            orderNo: second.source.lesson.order,
            title: second.source.lesson.title,
          },
        ) || first.index - second.index,
    );
  return ordered.flatMap(({ source: { lesson, classId } }) => {
    const query = `version=${lesson.id}${classId ? `&class=${classId}` : ""}`;
    return lesson.content.grammar.map((grammar) => ({
      key: `${lesson.id}:${grammar.id}`,
      pattern: grammar.pattern,
      vi: grammar.vi,
      explain: grammar.explain,
      mistake: grammar.viMistake?.trim() || null,
      examples: grammar.examples.map(({ jp, vi, audio }) => ({ jp, vi, audio: audio ?? null })),
      lessonId: lesson.lessonId,
      lessonTitle: lesson.title,
      href: `/lessons/${lesson.lessonId}?${query}#${grammar.id}`,
    }));
  });
}

// An explanation is written as a few short sentences (use, how to join, how to ask). Shown one
// per line, they read as a list instead of one block. A sentence ends at ".", "。", "!" or "?"
// followed by a space; a closing bracket after the space stays with the sentence before it.
export function explainPoints(explain: string): string[] {
  return explain
    .split(/(?<=[.。!?])\s+(?=[^\s)）])/u)
    .map((point) => point.trim())
    .filter(Boolean);
}
