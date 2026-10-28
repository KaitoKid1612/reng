"use client";

import dynamic from "next/dynamic";

// Client-only so unsynced answers saved in this browser are restored before the first render.
export const AttemptRunnerLoader = dynamic(
  () => import("@/components/classroom/attempt-runner").then((module) => module.AttemptRunner),
  { ssr: false, loading: () => <p role="status">Đang mở bài làm…</p> },
);
