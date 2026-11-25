"use client";

import { useEffect, useRef } from "react";

import { keepEditorDraft } from "@/lib/local-draft";

const BACKUP_DELAY_MS = 800;

// Keeps unsaved edits in this browser while the editor is dirty, so a failed save, a new
// deploy or a closed tab does not lose them. The server draft stays the source of truth.
export function useEditorBackup(
  lessonId: string,
  revision: number,
  draft: unknown,
  isDirty: boolean,
) {
  const latestRef = useRef({ lessonId, revision, draft, isDirty });
  useEffect(() => {
    latestRef.current = { lessonId, revision, draft, isDirty };
  }, [draft, isDirty, lessonId, revision]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const timer = window.setTimeout(
      () => keepEditorDraft(lessonId, revision, draft),
      BACKUP_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [draft, isDirty, lessonId, revision]);

  // Leaving the editor within the delay above would drop the last edits; they are kept at once.
  useEffect(
    () => () => {
      const latest = latestRef.current;
      if (latest.isDirty) {
        keepEditorDraft(latest.lessonId, latest.revision, latest.draft);
      }
    },
    [],
  );
}
