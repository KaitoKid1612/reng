import { z } from "zod";

// Browser-only fallback for unsynced answers; the server draft stays the source of truth.
const PREFIX = "reng:draft:";

const attemptDraftSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  checked: z.array(z.string()),
  listens: z.record(z.string(), z.number()).default({}),
});

const backupSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  draft: attemptDraftSchema,
  // Drafts sent on top of baseRevision whose reply never arrived; the server may hold one.
  unconfirmed: z.array(attemptDraftSchema).default([]),
  changedAt: z.string(),
});

export type LocalDraftBackup = z.infer<typeof backupSchema>;

// Lesson editors keep unsaved edits the same way; the editor parses the draft itself.
const editorBackupSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  draft: z.unknown(),
  // Drafts sent on top of baseRevision whose reply never arrived; the server may hold one.
  unconfirmed: z.array(z.unknown()).default([]),
  changedAt: z.string(),
});

const MAX_UNCONFIRMED_EDITOR_SAVES = 3;

export type EditorDraftBackup = z.infer<typeof editorBackupSchema>;

export function localDraftKey(userId: string, submissionId: string) {
  return `${PREFIX}${userId}:${submissionId}`;
}

export function editorDraftKey(lessonId: string) {
  return `${PREFIX}lesson:${lessonId}`;
}

function readEditorBackup(key: string) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? editorBackupSchema.parse(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

// `sent` marks a save or publish request whose reply was lost: it may have reached the server.
export function keepEditorDraft(
  lessonId: string,
  baseRevision: number,
  draft: unknown,
  sent?: unknown,
) {
  const key = editorDraftKey(lessonId);
  const previous = readEditorBackup(key);
  const unconfirmed = previous?.baseRevision === baseRevision ? previous.unconfirmed : [];
  return writeLocalDraft(key, {
    baseRevision,
    draft,
    unconfirmed:
      sent === undefined
        ? unconfirmed
        : [...unconfirmed, sent].slice(-MAX_UNCONFIRMED_EDITOR_SAVES),
    changedAt: new Date().toISOString(),
  });
}

// Key order differs between a draft built in the editor and one read back from the database.
function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([name, item]) => `${JSON.stringify(name)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isSameEditorDraft(first: unknown, second: unknown) {
  return stableJson(first) === stableJson(second);
}

// Unsaved edits made on top of the revision the page loaded are restored. A copy based on an
// older revision is restored only when the server draft is one this browser sent without
// hearing back (the save went through, its reply was lost); otherwise the newer server draft
// came from another tab or device and the copy is dropped.
export function restoreEditorDraft<T>(
  lessonId: string,
  revision: number,
  parse: (draft: unknown) => T,
  serverDraft: T,
  isSameDraft: (first: T, second: T) => boolean = isSameEditorDraft,
): { draft: T; changedAt: string } | null {
  const key = editorDraftKey(lessonId);
  const backup = readEditorBackup(key);
  if (!backup) {
    return null;
  }
  const matchesServer = (sent: unknown) => {
    try {
      return isSameDraft(parse(sent), serverDraft);
    } catch {
      return false;
    }
  };
  try {
    const isOwnLostSave = backup.baseRevision < revision && backup.unconfirmed.some(matchesServer);
    if (backup.baseRevision !== revision && !isOwnLostSave) {
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
