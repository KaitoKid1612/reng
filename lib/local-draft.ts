import { z } from "zod";

// Browser-only fallback for unsynced answers; the server draft stays the source of truth.
const PREFIX = "reng:draft:";

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

// Lesson editors keep unsaved edits the same way; the editor parses the draft itself.
const editorBackupSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  draft: z.unknown(),
  changedAt: z.string(),
});

export type EditorDraftBackup = z.infer<typeof editorBackupSchema>;

export function localDraftKey(userId: string, submissionId: string) {
  return `${PREFIX}${userId}:${submissionId}`;
}

export function editorDraftKey(lessonId: string) {
  return `${PREFIX}lesson:${lessonId}`;
}

export function keepEditorDraft(lessonId: string, baseRevision: number, draft: unknown) {
  return writeLocalDraft(editorDraftKey(lessonId), {
    baseRevision,
    draft,
    changedAt: new Date().toISOString(),
  });
}

// Unsaved edits made on top of the revision the page loaded are restored; a copy based on an
// older revision is dropped because the server draft is newer.
export function restoreEditorDraft<T>(
  lessonId: string,
  revision: number,
  parse: (draft: unknown) => T,
): { draft: T; changedAt: string } | null {
  const key = editorDraftKey(lessonId);
  try {
    const value = window.localStorage.getItem(key);
    if (!value) {
      return null;
    }
    const backup = editorBackupSchema.parse(JSON.parse(value));
    if (backup.baseRevision !== revision) {
      removeLocalDraft(key);
      return null;
    }
    return { draft: parse(backup.draft), changedAt: backup.changedAt };
  } catch {
    return null;
  }
}

export function readLocalDraft(key: string): LocalDraftBackup | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? backupSchema.parse(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft(key: string, backup: LocalDraftBackup | EditorDraftBackup) {
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
