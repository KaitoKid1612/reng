import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { topicKeysFor } from "../lib/grammar-topic-keys";
import {
  GRAMMAR_TOPIC_FILE,
  groupByTopic,
  OTHER_TOPIC_ID,
  topicTitleOf,
} from "../lib/grammar-topics";
import { STARTER_LESSONS } from "../lib/starter-lessons";

import type { GrammarEntry } from "../lib/grammar-search";

// Every grammar point Reng ships: the starters and the bundled sample lessons (filed by their ID).
function shippedPoints() {
  const points = new Map<string, string>();
  for (const starter of STARTER_LESSONS) {
    for (const point of starter.draft.content.grammar) {
      points.set(`${starter.id}:${point.id}`, point.pattern);
    }
  }
  for (const file of readdirSync("content/lessons").filter((name) => name.endsWith(".json"))) {
    const lesson = JSON.parse(readFileSync(`content/lessons/${file}`, "utf8"));
    for (const point of (lesson.content ?? lesson).grammar ?? []) {
      points.set(`${file.replace(/\.json$/, "")}:${point.id}`, point.pattern);
    }
  }
  return points;
}

test("every shipped grammar point belongs to exactly one concept of one topic", () => {
  const shipped = shippedPoints();
  const seen = new Map<string, string>();
  for (const topic of GRAMMAR_TOPIC_FILE.topics) {
    for (const key of topic.concepts.flat()) {
      assert.ok(shipped.has(key), `${key} in ${topic.id} is not a shipped grammar point`);
      assert.equal(seen.get(key), undefined, `${key} is filed twice`);
      seen.set(key, topic.id);
    }
  }
  assert.deepEqual(
    [...shipped.keys()].filter((key) => !seen.has(key)),
    [],
    "unfiled grammar points",
  );
  const ids = GRAMMAR_TOPIC_FILE.topics.map((topic) => topic.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes(OTHER_TOPIC_ID));
});

test("comparison rows name concepts and fill every column", () => {
  const firsts = new Set(
    GRAMMAR_TOPIC_FILE.topics.flatMap((topic) => topic.concepts.map((c) => c[0])),
  );
  for (const comparison of GRAMMAR_TOPIC_FILE.comparisons) {
    assert.ok(GRAMMAR_TOPIC_FILE.topics.some((topic) => topic.id === comparison.topic));
    for (const row of comparison.rows) {
      assert.equal(row.cells.length, comparison.columns.length, row.cells[0]);
      for (const concept of row.concepts) {
        assert.ok(firsts.has(concept), `${concept} is not the first key of a concept`);
      }
    }
  }
});

test("a point keeps its starter even when the grammar ID repeats elsewhere", () => {
  // Minna lesson 4 and the bundled lesson-04 both use g0402 for different patterns.
  assert.deepEqual(topicKeysFor([{ id: "g0402", pattern: "V ます／V ません" }]), {
    g0402: "minna-1-04:g0402",
  });
  assert.deepEqual(topicKeysFor([{ id: "g0402", pattern: "N から N まで" }]), {});
  // The creation fingerprint wins, even over a reworded pattern.
  assert.deepEqual(topicKeysFor([{ id: "g3202", pattern: "でしょう (sửa)" }], "minna-2-32"), {
    g3202: "minna-2-32:g3202",
  });
  // Without a fingerprint, a reworded pattern no longer claims the starter's topic.
  assert.deepEqual(topicKeysFor([{ id: "g3202", pattern: "でしょう (sửa)" }]), {});
});

function entry(key: string, topicKey: string, lessonId: string): GrammarEntry {
  return {
    key,
    pattern: key,
    vi: key,
    explain: key,
    mistake: null,
    examples: [],
    lessonId,
    lessonTitle: `Bài ${lessonId}`,
    href: `/lessons/${lessonId}#${key}`,
    topicKey,
  };
}

test("the topic view shows a point taught in two lessons once, with the other lesson linked", () => {
  const entries = [
    entry("a", "minna-2-32:g3202", "l32"),
    entry("b", "minna-2-32:g3203", "l32"),
    entry("c", "n4-grammar-5:n4g-deshou", "n4-5"),
    entry("d", "n4-grammar-5:n4g-rashii", "n4-5"),
    entry("e", "minna-2-32:g3202", "l32-copy"),
    entry("f", "lesson-x:g-own", "own"),
  ];
  const groups = groupByTopic(entries);
  const guessing = groups.find((group) => group.id === "suy-doan");
  assert.ok(guessing);
  // でしょう once (Minna first), then かもしれません, then らしい; the copy of lesson 32 and the N4
  // review are linked, in the order of the concept's keys.
  assert.deepEqual(
    guessing.points.map((point) => [point.entry.key, point.others.map((other) => other.key)]),
    [
      ["a", ["e", "c"]],
      ["b", []],
      ["d", []],
    ],
  );
  assert.deepEqual(
    guessing.comparison?.rows.map((row) => row[0]),
    ["〜でしょう", "〜かもしれません", "〜らしいです"],
  );
  // A teacher's own point is not lost.
  assert.deepEqual(groups.at(-1)?.id, OTHER_TOPIC_ID);
  assert.deepEqual(
    groups.at(-1)?.points.map((point) => point.entry.key),
    ["f"],
  );
});

test("a search narrows the points but not the comparison rows, and one row is no comparison", () => {
  const all = [entry("a", "minna-2-32:g3202", "l32"), entry("b", "minna-2-32:g3203", "l32")];
  const [group] = groupByTopic([all[1]], all);
  assert.equal(group.points.length, 1);
  assert.equal(group.comparison?.rows.length, 2);
  assert.equal(groupByTopic([all[0]])[0].comparison, undefined);
  assert.match(topicTitleOf("minna-2-32:g3202"), /^Có lẽ/);
  assert.equal(topicTitleOf("lesson-x:g-own"), "");
});
