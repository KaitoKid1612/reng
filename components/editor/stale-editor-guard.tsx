"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { isOlderThanEditorSave } from "@/lib/local-draft";

import type { ReactNode } from "react";

interface StaleEditorGuardProps {
  lessonId: string;
  revision: number;
  children: ReactNode;
}

// Browser Back can show the editor page as first loaded, older than what this tab already saved.
// The page is fetched again and the editor mounts only on the fresh copy. Worked out on every
// render, not kept in state: a fresh copy arrives as new props, and an editor already open is
// never remounted by a later refresh (that would drop its state).
export function StaleEditorGuard({ lessonId, revision, children }: StaleEditorGuardProps) {
  const router = useRouter();
  const isStale = isOlderThanEditorSave(lessonId, revision);
  useEffect(() => {
    if (isStale) {
      router.refresh();
    }
  }, [isStale, router]);
  if (isStale) {
    return <p role="status">Đang tải bản nháp mới nhất…</p>;
  }
  return children;
}
