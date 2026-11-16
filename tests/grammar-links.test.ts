import assert from "node:assert/strict";
import { test } from "node:test";

import { buildGrammarLinks, findGrammarLinks, grammarRefs } from "../lib/grammar-links";

import type { PublicLesson } from "../lib/lesson-schema";

function lesson(lessonId: string, versionId: string, ids: string[]) {
  return {
    id: versionId,
    lessonId,
    title: `Bài ${lessonId}`,
    content: {
      grammar: ids.map((id) => ({ id, pattern: `〜${id}`, vi: id, explain: id, examples: [] })),
    },
  } as unknown as PublicLesson;
}

test("a question's grammar tags link to the first class lesson that explains the point", () => {
  assert.deepEqual(grammarRefs(["n4", "grammar", "grammar:n4g-nagara", "grammar:n4g-shi"]), [
    "n4g-nagara",
    "n4g-shi",
  ]);
  const links = buildGrammarLinks(
    [lesson("deck-1", "v1", ["n4g-nagara"]), lesson("deck-9", "v9", ["n4g-nagara", "n4g-shi"])],
    "class-1",
  );
  assert.deepEqual(findGrammarLinks(["n4g-nagara", "n4g-unknown"], links), [
    {
      href: "/lessons/deck-1?version=v1&class=class-1#n4g-nagara",
      pattern: "〜n4g-nagara",
      lessonTitle: "Bài deck-1",
    },
  ]);
  assert.equal(
    findGrammarLinks(["n4g-shi"], links)[0]?.href,
    "/lessons/deck-9?version=v9&class=class-1#n4g-shi",
  );
  assert.deepEqual(findGrammarLinks(["n4g-shi"], undefined), []);
});
