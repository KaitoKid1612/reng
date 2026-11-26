import { STARTER_LESSONS } from "@/lib/starter-lessons";

// Starter of each starter grammar point, by grammar ID and pattern. Grammar IDs repeat across
// sources (the bundled lesson-04 uses g0402 for から〜まで, Minna lesson 4 for ます／ません), so the
// pattern is part of the key; within the starters each pair is unique.
let starterPoints: Map<string, string> | undefined;
function starterOfPoint(grammarId: string, pattern: string) {
  starterPoints ??= new Map(
    STARTER_LESSONS.flatMap((starter) =>
      starter.draft.content.grammar.map((point) => [
        `${point.id}\u0000${point.pattern}`,
        starter.id,
      ]),
    ),
  );
  return starterPoints.get(`${grammarId}\u0000${pattern}`);
}

/**
 * Topic keys ("<starter>:<grammar ID>", lib/grammar-topics.ts) of a lesson's grammar points. A
 * lesson made from a starter (`originStarterId`, from its creation fingerprint) files every point
 * under that starter, even one whose pattern the teacher reworded; a lesson without one still
 * matches a starter point with the same ID and pattern. Points matching nothing get no key.
 */
export function topicKeysFor(
  grammar: readonly { id: string; pattern: string }[],
  originStarterId?: string,
): Record<string, string> {
  const keys: Record<string, string> = {};
  for (const point of grammar) {
    const starter = originStarterId ?? starterOfPoint(point.id, point.pattern);
    if (starter) {
      keys[point.id] = `${starter}:${point.id}`;
    }
  }
  return keys;
}
