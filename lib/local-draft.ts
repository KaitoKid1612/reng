import { z } from "zod";

// Browser-only fallback for unsynced answers; the server draft stays the source of truth.
const PREFIX = "masu:draft:";

const backupSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  draft: z.object({
    answers: z.record(z.string(), z.unknown()),
    checked: z.array(z.string()),
    listens: z.record(z.string(), z.number()).default({}),
  }),
  changedAt: z.string(),
});

export type LocalDraftBackup = z.infer<typeof backupSchema>;

export function localDraftKey(userId: string, submissionId: string) {
  return `${PREFIX}${userId}:${submissionId}`;
}

export function readLocalDraft(key: string): LocalDraftBackup | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? backupSchema.parse(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft(key: string, backup: LocalDraftBackup) {
  try {
    window.localStorage.setItem(key, JSON.stringify(backup));
    return true;
  } catch {
    return false;
  }
}

export function removeLocalDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in private browsing; there is nothing left to clean up.
  }
}

export function clearLocalDrafts() {
  try {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) =>
      window.localStorage.key(index),
    );
    keys
      .filter((key): key is string => key?.startsWith(PREFIX) ?? false)
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in private browsing; there is nothing left to clean up.
  }
}
