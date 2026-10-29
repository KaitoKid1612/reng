// Daily practice runs on Vietnam calendar days (UTC+7, no daylight saving).
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DAILY_PRACTICE_SIZES = [5, 7, 10, 15] as const;
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

// Least recently used first, never-used questions before anything else; ties break by a hash
// of the day so the set changes daily but stays the same on every retry of that day.
export function selectDailyQuestions(
  candidateIds: readonly string[],
  recentUses: readonly DailyQuestionUse[],
  size: number,
  seed: string,
) {
  const lastUsed = new Map<string, string>();
  for (const use of recentUses) {
    if ((lastUsed.get(use.questionId) ?? "") < use.practiceDate) {
      lastUsed.set(use.questionId, use.practiceDate);
    }
  }
  return [...new Set(candidateIds)]
    .map((id) => ({ id, lastUsed: lastUsed.get(id) ?? "", order: hashToNumber(`${seed}:${id}`) }))
    .sort(
      (first, second) =>
        first.lastUsed.localeCompare(second.lastUsed) || first.order - second.order,
    )
    .slice(0, size)
    .map((item) => item.id);
}
