import { JLPT_PARTS, jlptFullDailySize, jlptPartOf, planJlptDailyParts } from "@/lib/jlpt-parts";

import type { JlptLevel, JlptSection } from "@/lib/jlpt";

// Daily practice runs on Vietnam calendar days (UTC+7, no daylight saving).
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DAILY_PRACTICE_SIZES = [5, 7, 10, 15, 20, 30, 40, 60, 70] as const;
// The database accepts any size in this range, for example a size set while importing a bank.
export const MIN_DAILY_PRACTICE_SIZE = 3;
export const MAX_DAILY_PRACTICE_SIZE = 70;

// A JLPT-format class may take every language and reading question of one test each day.
export const JLPT_FULL_DAILY_SIZES = [jlptFullDailySize("N5"), jlptFullDailySize("N4")];

// The usual sizes plus the class's current one, so the menu never shows a different value
// from the one in use, and saving it unchanged keeps it.
export function dailyPracticeSizeOptions(current: number | null) {
  const sizes = new Set<number>([...DAILY_PRACTICE_SIZES, ...JLPT_FULL_DAILY_SIZES]);
  if (current !== null) {
    sizes.add(current);
  }
  return [...sizes].sort((first, second) => first - second);
}
// Questions seen within this window are rotated to the back of the queue.
export const DAILY_PRACTICE_HISTORY_DAYS = 14;

export interface DailyQuestionUse {
  questionId: string;
  practiceDate: string;
}

export function toVietnamDate(now: Date) {
  return new Date(now.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
}

export function daysBefore(practiceDate: string, days: number) {
  return new Date(Date.parse(`${practiceDate}T00:00:00Z`) - days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

// Due at the last second of the practice day; late work stays allowed by the assignment.
export function endOfVietnamDay(practiceDate: string) {
  return new Date(Date.parse(`${practiceDate}T23:59:59+07:00`)).toISOString();
}

function hashToNumber(value: string) {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

// The pinned lesson (a review bank, say) is tried first while it is open; the newest open lessons
// follow so a pinned lesson without questions does not stop the daily habit.
export function orderDailySourceLessons(
  newestFirst: readonly string[],
  openPinnedLessonId: string | null,
) {
  if (!openPinnedLessonId) {
    return [...newestFirst];
  }
  return [openPinnedLessonId, ...newestFirst.filter((id) => id !== openPinnedLessonId)];
}

type DailySourceState = "automatic" | "pinned" | "fallback";

export function dailySourceState(
  pinnedLessonId: string | null,
  sourceLessonId: string | null,
): DailySourceState {
  if (!pinnedLessonId) {
    return "automatic";
  }
  return pinnedLessonId === sourceLessonId ? "pinned" : "fallback";
}

// With no more questions than the daily size, every question comes back every day; a source of
// exactly the daily size repeats in full too.
export function repeatsEveryDay(questionCount: number, size: number | null) {
  return size !== null && questionCount <= size;
}

// A listening question can only be published with reviewed audio, so a lesson that has some
// (such as the Minna listening sets) puts them in its daily sets as their own kinds.
const DAILY_QUESTION_TYPES: readonly string[] = [
  "choice",
  "fill",
  "order",
  "match",
  "listen",
  "dictation",
];

export function isDailyQuestionType(type: string) {
  return DAILY_QUESTION_TYPES.includes(type);
}

export interface DailyCandidate {
  id: string;
  type: string;
  tags: readonly string[];
  // Questions about one reading passage share a group: they are taken and shown together.
  group?: string;
}

// A kind is the question type plus the tags that tell questions apart, such as the teacher's
// "Dạng bài" from a sheet or "kanji" in a Minna lesson. A tag every candidate shares (the lesson
// tag) or a per-item tag such as kanji:v1201 says nothing about the kind.
export function dailyQuestionKind(candidate: DailyCandidate, sharedTags: ReadonlySet<string>) {
  const tags = candidate.tags.filter((tag) => !sharedTags.has(tag) && !tag.includes(":"));
  return [candidate.type, ...[...new Set(tags)].sort()].join("|");
}

// Largest remainder: every kind gets a share of the set in proportion to its size in the lesson.
function allocateQuotas(kinds: readonly { key: string; count: number }[], size: number) {
  const total = kinds.reduce((sum, kind) => sum + kind.count, 0);
  const target = Math.min(size, total);
  const quotas = kinds.map((kind) => {
    const exact = total ? (kind.count / total) * target : 0;
    return { key: kind.key, count: kind.count, quota: Math.floor(exact), rest: exact % 1 };
  });
  let left = target - quotas.reduce((sum, item) => sum + item.quota, 0);
  // A stable sort keeps lesson order between equal remainders.
  for (const item of [...quotas].sort((first, second) => second.rest - first.rest)) {
    if (left > 0 && item.quota < item.count) {
      item.quota += 1;
      left -= 1;
    }
  }
  return new Map(quotas.map((item) => [item.key, item.quota]));
}

// Each kind keeps its share of the daily set, in lesson order of first appearance; inside a kind
// the usual rotation applies. A lesson with one kind gets exactly selectDailyQuestions' set.
export function selectBalancedDailyQuestions(
  candidates: readonly DailyCandidate[],
  recentUses: readonly DailyQuestionUse[],
  size: number,
  seed: string,
) {
  const unique = [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
  const tagCounts = new Map<string, number>();
  for (const candidate of unique) {
    for (const tag of new Set(candidate.tags)) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const sharedTags = new Set(
    [...tagCounts].filter(([, count]) => count === unique.length).map(([tag]) => tag),
  );
  const kinds = new Map<string, string[]>();
  const groups = new Map<string, string>();
  for (const candidate of unique) {
    const key = dailyQuestionKind(candidate, sharedTags);
    kinds.set(key, [...(kinds.get(key) ?? []), candidate.id]);
    if (candidate.group) {
      groups.set(candidate.id, candidate.group);
    }
  }
  const quotas = allocateQuotas(
    [...kinds].map(([key, ids]) => ({ key, count: ids.length })),
    size,
  );
  return [...kinds].flatMap(([key, ids]) =>
    selectDailyQuestions(ids, recentUses, quotas.get(key) ?? 0, seed, groups),
  );
}

// Reserve a requested number of audio questions before distributing the remaining slots.
// Keep the existing proportional selector for both pools, preserving per-kind balance and rotation.
// When audio is insufficient, fill the rest from non-audio questions without duplicating IDs.
export function selectDailyQuestionsWithListeningQuota(
  candidates: readonly DailyCandidate[],
  recentUses: readonly DailyQuestionUse[],
  size: number,
  seed: string,
  listeningCount: number | null,
) {
  if (listeningCount === null) {
    return selectBalancedDailyQuestions(candidates, recentUses, size, seed);
  }
  const unique = [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
  const listening = unique.filter((item) => item.type === "listen" || item.type === "dictation");
  const others = unique.filter((item) => item.type !== "listen" && item.type !== "dictation");
  const target = Math.min(size, unique.length);
  const listeningSize = Math.min(listeningCount, target, listening.length);
  const selectedListening = selectBalancedDailyQuestions(
    listening,
    recentUses,
    listeningSize,
    seed,
  );
  const selectedOthers = selectBalancedDailyQuestions(
    others,
    recentUses,
    target - selectedListening.length,
    seed,
  );
  const missing = target - selectedListening.length - selectedOthers.length;
  // A count of 0 leaves listening out (migration 20261104110635), even if the set ends shorter.
  const extraListening =
    missing > 0 && listeningCount > 0
      ? selectBalancedDailyQuestions(
          listening.filter((item) => !selectedListening.includes(item.id)),
          recentUses,
          missing,
          seed,
        )
      : [];
  return [...selectedListening, ...selectedOthers, ...extraListening];
}

/**
 * A daily set laid out like the JLPT test: each part (もんだい) takes its count in test order,
 * listening last, with the usual rotation inside each part. A part short of questions is made up
 * from the other parts of its section, then from the source's questions in no exam format, then
 * from any language question; the listening count 0 keeps listening out.
 */
export function selectJlptDailyQuestions(
  candidates: readonly DailyCandidate[],
  recentUses: readonly DailyQuestionUse[],
  size: number,
  seed: string,
  level: JlptLevel,
  listeningCount: number | null,
) {
  const unique = [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
  const groups = new Map<string, string>();
  const partIndex = new Map<string, number>();
  for (const candidate of unique) {
    if (candidate.group) {
      groups.set(candidate.id, candidate.group);
    }
    const part = jlptPartOf(candidate);
    if (part) {
      partIndex.set(candidate.id, JLPT_PARTS.indexOf(part));
    }
  }
  const sectionOf = (candidate: DailyCandidate) => {
    const index = partIndex.get(candidate.id);
    return index === undefined ? null : JLPT_PARTS[index].section;
  };
  const isListening = (candidate: DailyCandidate) =>
    candidate.type === "listen" || candidate.type === "dictation";
  const plan = planJlptDailyParts(level, Math.min(size, unique.length), listeningCount);
  const target = plan.reduce((total, item) => total + item.count, 0);
  const chosen: string[] = [];
  const pick = (pool: readonly DailyCandidate[], count: number) => {
    if (count <= 0) {
      return 0;
    }
    const ids = selectDailyQuestions(
      pool.filter((candidate) => !chosen.includes(candidate.id)).map((candidate) => candidate.id),
      recentUses,
      count,
      seed,
      groups,
    );
    chosen.push(...ids);
    return ids.length;
  };
  const missing = new Map<JlptSection, number>();
  for (const { part, count } of plan) {
    const index = JLPT_PARTS.indexOf(part);
    const taken = pick(
      unique.filter((candidate) => partIndex.get(candidate.id) === index),
      count,
    );
    missing.set(part.section, (missing.get(part.section) ?? 0) + count - taken);
  }
  for (const [section, count] of missing) {
    const left =
      count -
      pick(
        unique.filter((candidate) => sectionOf(candidate) === section),
        count,
      );
    pick(
      unique.filter(
        (candidate) =>
          !partIndex.has(candidate.id) && (section === "listening") === isListening(candidate),
      ),
      left,
    );
  }
  pick(
    unique.filter((candidate) => !isListening(candidate)),
    target - chosen.length,
  );
  if (listeningCount !== 0) {
    pick(unique, target - chosen.length);
  }
  // Test order; a question in no exam format closes its block (language or listening).
  const firstListening = JLPT_PARTS.findIndex((part) => part.section === "listening");
  const byId = new Map(unique.map((candidate) => [candidate.id, candidate]));
  const position = (id: string) => {
    const index = partIndex.get(id);
    if (index !== undefined) {
      return index;
    }
    const candidate = byId.get(id);
    return candidate && isListening(candidate) ? JLPT_PARTS.length : firstListening - 0.5;
  };
  return chosen
    .map((id, order) => ({ id, order }))
    .sort((first, second) => position(first.id) - position(second.id) || first.order - second.order)
    .map((item) => item.id);
}

// Least recently used first, never-used questions before anything else; ties break by a hash
// of the day so the set changes daily but stays the same on every retry of that day. Grouped
// questions share their group's hash, so a passage's questions are picked one after another,
// and the chosen ones of a group are shown together in lesson order.
export function selectDailyQuestions(
  candidateIds: readonly string[],
  recentUses: readonly DailyQuestionUse[],
  size: number,
  seed: string,
  groups: ReadonlyMap<string, string> = new Map(),
) {
  const lastUsed = new Map<string, string>();
  for (const use of recentUses) {
    if ((lastUsed.get(use.questionId) ?? "") < use.practiceDate) {
      lastUsed.set(use.questionId, use.practiceDate);
    }
  }
  const chosen = [...new Set(candidateIds)]
    .map((id, index) => {
      const group = groups.get(id) ?? id;
      return {
        id,
        group,
        index,
        lastUsed: lastUsed.get(id) ?? "",
        order: hashToNumber(`${seed}:${group}`),
      };
    })
    .sort(
      (first, second) =>
        first.lastUsed.localeCompare(second.lastUsed) ||
        first.order - second.order ||
        first.index - second.index,
    )
    .slice(0, size);
  const groupStart = new Map<string, number>();
  chosen.forEach((item, position) => {
    if (!groupStart.has(item.group)) {
      groupStart.set(item.group, position);
    }
  });
  return [...chosen]
    .sort(
      (first, second) =>
        (groupStart.get(first.group) ?? 0) - (groupStart.get(second.group) ?? 0) ||
        first.index - second.index,
    )
    .map((item) => item.id);
}
