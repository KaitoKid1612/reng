import assert from "node:assert/strict";
import { test } from "node:test";

import { toGrammarEntries } from "../lib/grammar-search";

import type { PublicLesson } from "../lib/lesson-schema";

function lesson(lessonId: string, versionId: string, ids: string[]) {
  return {
    id: versionId,
    lessonId,
    title: `Bài ${lessonId}`,
    content: {
      grammar: ids.map((id) => ({ id, pattern: `〜${id}`, vi: id, explain: id, examples: [] })),
      slides: [{ id: "big" }],
    },
  } as unknown as PublicLesson;
}

test("grammar lookup keeps each lesson once, linked to its class, without the rest of the lesson", () => {
  const entries = toGrammarEntries([
    { lesson: lesson("minna-2-27", "v-class", ["g2701", "g2702"]), classId: "class-1" },
    { lesson: lesson("minna-2-27", "v-newest", ["g2701"]) },
    { lesson: lesson("lesson-05", "v5", ["g0501"]) },
  ]);
  assert.deepEqual(
    entries.map((entry) => entry.href),
    [
      "/lessons/minna-2-27?version=v-class&class=class-1#g2701",
      "/lessons/minna-2-27?version=v-class&class=class-1#g2702",
      "/lessons/lesson-05?version=v5#g0501",
    ],
  );
  assert.deepEqual(Object.keys(entries[0]).sort(), [
    "explain",
    "href",
    "key",
    "lessonTitle",
    "pattern",
    "vi",
  ]);
  assert.equal(entries[2].lessonTitle, "Bài lesson-05");
});
