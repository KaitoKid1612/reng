"use client";

import dynamic from "next/dynamic";

// Client-only so unsaved edits kept in this browser are restored before the first render.
export const LessonEditorLoader = dynamic(
  () => import("@/components/editor/lesson-editor").then((module) => module.LessonEditor),
  { ssr: false, loading: () => <p role="status">Đang mở trình soạn bài…</p> },
);

export const TeachingEditorLoader = dynamic(
  () => import("@/components/teaching/teaching-editor").then((module) => module.TeachingEditor),
  { ssr: false, loading: () => <p role="status">Đang mở trình soạn bài…</p> },
);
