import type { PublicLesson } from "@/lib/lesson-schema";

// A question names the grammar point it tests with a "grammar:<grammar id>" tag; a class lesson
// that explains that point (the N4 review decks, say) then gets a link after the answer.
const GRAMMAR_TAG = "grammar:";

export interface GrammarLink {
  href: string;
  pattern: string;
  lessonTitle: string;
}

export type GrammarLinks = Readonly<Record<string, GrammarLink>>;

export function grammarRefs(tags: readonly string[]) {
  return tags
    .filter((tag) => tag.startsWith(GRAMMAR_TAG))
    .map((tag) => tag.slice(GRAMMAR_TAG.length));
}

// The first lesson in class order that explains a point wins, so a repeated id never flips.
export function buildGrammarLinks(lessons: readonly PublicLesson[], classId: string) {
  const links: Record<string, GrammarLink> = {};
  for (const lesson of lessons) {
    for (const grammar of lesson.content.grammar) {
      links[grammar.id] ??= {
        href: `/lessons/${lesson.lessonId}?version=${lesson.id}&class=${classId}#${grammar.id}`,
        pattern: grammar.pattern,
        lessonTitle: lesson.title,
      };
    }
  }
  return links;
}

export function findGrammarLinks(refs: readonly string[], links: GrammarLinks | undefined) {
  if (!links) {
    return [];
  }
  return refs.flatMap((id) => (links[id] ? [links[id]] : []));
}
