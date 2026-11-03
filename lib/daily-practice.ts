// Daily practice runs on Vietnam calendar days (UTC+7, no daylight saving).
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DAILY_PRACTICE_SIZES = [5, 7, 10, 15, 20, 30, 40, 60] as const;
// The database accepts any size in this range, for example a size set while importing a bank.
export const MIN_DAILY_PRACTICE_SIZE = 3;
export const MAX_DAILY_PRACTICE_SIZE = 60;

// The usual sizes plus the class's current one, so the menu never shows a different value
// from the one in use, and saving it unchanged keeps it.
export function dailyPracticeSizeOptions(current: number | null) {
  const sizes = new Set<number>(DAILY_PRACTICE_SIZES);
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

export type DailySourceState = "automatic" | "pinned" | "fallback";

export function dailySourceState(pinnedLessonId: string | null, sourceLessonId: string | null) {
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

// Listening needs audio that a bank may not have, so daily sets use the other kinds.
export const DAILY_QUESTION_TYPES: readonly string[] = ["choice", "fill", "order"];

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
