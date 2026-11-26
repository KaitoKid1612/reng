import { z } from "zod";

import topicData from "@/content/grammar-topics.json";

import type { GrammarEntry } from "@/lib/grammar-search";

// Grammar points grouped by what they are used for ("có lẽ", điều kiện, cho nhận…) across lessons,
// for the "Theo chủ đề" view of the grammar lookup. A point is identified by its topic key,
// "<origin>:<grammar id>", where the origin is the starter a lesson was made from (or the lesson
// ID for a lesson without one): grammar IDs repeat across sources (the old sample lesson-04 uses
// g0402 for から〜まで, Minna lesson 4 for ます／ません), so the ID alone would misfile points.
//
// A concept lists keys that teach the same point 1:1 in different lessons (Minna lesson 32 and
// the N4 review both teach でしょう); the lookup shows it once. Points that only overlap stay
// separate concepts so merging never hides one. content/grammar-topics.json is built and checked by
// tests/grammar-topics.test.ts: every starter grammar point belongs to exactly one concept.

const text = z.string().trim().min(1);

const topicFileSchema = z
  .object({
    topics: z.array(
      z
        .object({
          id: z.string().regex(/^[a-z0-9-]+$/),
          title: text,
          summary: text,
          concepts: z.array(z.array(text).min(1)).min(1),
        })
        .strict(),
    ),
    comparisons: z.array(
      z
        .object({
          topic: text,
          title: text,
          tip: text,
          columns: z.array(text).min(2),
          rows: z.array(
            z.object({ concepts: z.array(text).min(1), cells: z.array(text).min(2) }).strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();

export const GRAMMAR_TOPIC_FILE = topicFileSchema.parse(topicData);

export const OTHER_TOPIC_ID = "khac";

const topicTitles = new Map(
  GRAMMAR_TOPIC_FILE.topics.flatMap((topic) =>
    topic.concepts.flat().map((key) => [key, topic.title] as const),
  ),
);

// The title of the topic a point belongs to, searched with the point: "có lẽ" finds every way of
// guessing, although Minna's own meaning line for でしょう reads "Đưa ra dự đoán".
export function topicTitleOf(topicKey: string) {
  return topicTitles.get(topicKey) ?? "";
}

export interface TopicPoint {
  entry: GrammarEntry;
  // The same concept in the reader's other lessons, for "Cũng có ở".
  others: GrammarEntry[];
}

export interface TopicComparison {
  title: string;
  tip: string;
  columns: string[];
  rows: string[][];
}

export interface TopicGroup {
  id: string;
  title: string;
  summary: string;
  points: TopicPoint[];
  comparison?: TopicComparison;
}

// Entries in their given (teaching) order, by topic key.
function indexByKey(entries: readonly GrammarEntry[]) {
  const byKey = new Map<string, GrammarEntry[]>();
  for (const entry of entries) {
    const list = byKey.get(entry.topicKey);
    if (list) {
      list.push(entry);
    } else {
      byKey.set(entry.topicKey, [entry]);
    }
  }
  return byKey;
}

/**
 * Groups points by topic in the file's order. `entries` is what the reader sees now (after the
 * search and filter); `allEntries` is everything the reader has, so a comparison table lists the
 * same rows whatever was typed, but only rows for points the reader has studied. Entries no topic
 * claims (lessons a teacher wrote) come last under "Mẫu khác".
 */
export function groupByTopic(
  entries: readonly GrammarEntry[],
  allEntries: readonly GrammarEntry[] = entries,
): TopicGroup[] {
  const visible = indexByKey(entries);
  const available = new Set(allEntries.map((entry) => entry.topicKey));
  const placed = new Set<string>();
  const groups: TopicGroup[] = [];
  for (const topic of GRAMMAR_TOPIC_FILE.topics) {
    const points: TopicPoint[] = [];
    for (const concept of topic.concepts) {
      const present = concept.flatMap((key) => visible.get(key) ?? []);
      for (const entry of present) {
        placed.add(entry.key);
      }
      const [entry, ...rest] = present;
      if (!entry) {
        continue;
      }
      // One link per other lesson; a second copy of the same lesson adds nothing.
      const lessons = new Set([entry.lessonId]);
      const others = rest.filter((other) => {
        if (lessons.has(other.lessonId)) {
          return false;
        }
        lessons.add(other.lessonId);
        return true;
      });
      points.push({ entry, others });
    }
    if (!points.length) {
      continue;
    }
    groups.push({
      id: topic.id,
      title: topic.title,
      summary: topic.summary,
      points,
      comparison: comparisonFor(topic.id, available),
    });
  }
  const rest = entries.filter((entry) => !placed.has(entry.key));
  if (rest.length) {
    groups.push({
      id: OTHER_TOPIC_ID,
      title: "Mẫu khác",
      summary: "Mẫu trong bài giáo viên tự soạn, chưa xếp vào chủ đề nào.",
      points: rest.map((entry) => ({ entry, others: [] })),
    });
  }
  return groups;
}

const conceptKeys = new Map(
  GRAMMAR_TOPIC_FILE.topics.flatMap((topic) =>
    topic.concepts.map((concept) => [concept[0], concept] as const),
  ),
);

// A comparison table keeps the rows whose point the reader has in some lesson; with fewer than two
// rows there is nothing to compare.
function comparisonFor(topicId: string, available: ReadonlySet<string>) {
  const comparison = GRAMMAR_TOPIC_FILE.comparisons.find((item) => item.topic === topicId);
  if (!comparison) {
    return undefined;
  }
  const rows = comparison.rows
    .filter((row) =>
      row.concepts.some((first) =>
        (conceptKeys.get(first) ?? [first]).some((key) => available.has(key)),
      ),
    )
    .map((row) => row.cells);
  return rows.length >= 2
    ? { title: comparison.title, tip: comparison.tip, columns: comparison.columns, rows }
    : undefined;
}
