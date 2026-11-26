import assert from "node:assert/strict";
import { test } from "node:test";

import { explainPoints, toGrammarEntries } from "../lib/grammar-search";

import type { PublicLesson } from "../lib/lesson-schema";

function lesson(lessonId: string, versionId: string, ids: string[], courseId = "n5", order = 1) {
  return {
    id: versionId,
    lessonId,
    title: `Bài ${lessonId}`,
    courseId,
    order,
    content: {
      grammar: ids.map((id) => ({
        id,
        pattern: `〜${id}`,
        vi: id,
        explain: id,
        viMistake: id === "g0501" ? "へ đọc là え." : undefined,
        examples: [{ jp: "あした 行きます。", vi: "Mai tôi đi.", audio: null }],
      })),
      slides: [{ id: "big" }],
    },
  } as unknown as PublicLesson;
}

test("grammar lookup keeps each lesson once, linked to its class, in teaching order", () => {
  const entries = toGrammarEntries([
    { lesson: lesson("minna-2-27", "v-class", ["g2701", "g2702"], "minna-2", 27), classId: "c1" },
    { lesson: lesson("minna-2-27", "v-newest", ["g2701"], "minna-2", 27) },
    { lesson: lesson("minna-1-05", "v5", ["g0501"], "minna-1", 5) },
  ]);
  // Minna I lesson 5 comes before Minna II lesson 27, although the class lesson was listed first.
  assert.deepEqual(
    entries.map((entry) => entry.href),
    [
      "/lessons/minna-1-05?version=v5#g0501",
      "/lessons/minna-2-27?version=v-class&class=c1#g2701",
      "/lessons/minna-2-27?version=v-class&class=c1#g2702",
    ],
  );
  // Only what the lookup draws is sent, not the lesson's slides and questions.
  assert.deepEqual(Object.keys(entries[0]).sort(), [
    "examples",
    "explain",
    "href",
    "key",
    "lessonId",
    "lessonTitle",
    "mistake",
    "pattern",
    "topicKey",
    "vi",
  ]);
  assert.equal(entries[0].mistake, "へ đọc là え.");
  // Without topic keys from the server, a point is filed by its lesson ID.
  assert.equal(entries[0].topicKey, "minna-1-05:g0501");
  assert.equal(entries[1].mistake, null);
  assert.deepEqual(entries[0].examples, [
    { jp: "あした 行きます。", vi: "Mai tôi đi.", audio: null },
  ]);
});

test("an explanation is shown one sentence per line", () => {
  assert.deepEqual(
    explainPoints(
      "Nhóm I: chuyển âm cuối sang hàng え rồi thêm る. Nhóm II: bỏ る, thêm られる. する → できる.",
    ),
    [
      "Nhóm I: chuyển âm cuối sang hàng え rồi thêm る.",
      "Nhóm II: bỏ る, thêm られる.",
      "する → できる.",
    ],
  );
  // A Japanese sentence ending in 。 also ends a point; brackets stay with their sentence.
  assert.deepEqual(explainPoints("Hỏi: どこへ 行きますか。 Đáp: どこも (hoặc どこへも)."), [
    "Hỏi: どこへ 行きますか。",
    "Đáp: どこも (hoặc どこへも).",
  ]);
  assert.deepEqual(explainPoints("Một câu duy nhất"), ["Một câu duy nhất"]);
});
