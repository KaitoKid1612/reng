import { z } from "zod";

import { SlideDeck } from "@/components/slides/slide-deck";
import { isDatabaseLessonSource } from "@/lib/lesson-repository";
import { getCurrentAccount } from "@/lib/server/account";
import { getLessonProgress } from "@/lib/server/learner";
import { loadAccessibleLesson, lessonNotFound } from "@/lib/server/lesson-access";

import type { Metadata } from "next";

// Presentation views duplicate the reader and are not meant for search results.
export const metadata: Metadata = { title: "Trình chiếu", robots: { index: false, follow: false } };

interface SlidePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string; class?: string; "print-pdf"?: string }>;
}

export default async function SlidePage({ params, searchParams }: SlidePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const lesson = await loadAccessibleLesson(id, query.version);
  if (!lesson) {
    const back = new URLSearchParams();
    if (typeof query.version === "string") {
      back.set("version", query.version);
    }
    if (typeof query.class === "string") {
      back.set("class", query.class);
    }
    return lessonNotFound(`/lessons/${id}/slide${back.size ? `?${back}` : ""}`);
  }
  // The class only shapes a link back to its own page, where access is checked again.
  const classId = z.uuid().safeParse(query.class).data;
  // A learner has no notes to open, so the teacher-only Presenter button stays out of their way.
  const account = isDatabaseLessonSource() ? await getCurrentAccount() : null;
  const isLearner = account?.role === "student";
  const progress = isLearner ? await getLessonProgress(account.id, id) : null;
  return (
    <SlideDeck
      lesson={lesson}
      printMode={query["print-pdf"] !== undefined}
      classId={classId}
      canPresent={!isLearner}
      readProgress={isLearner ? { completedAt: progress?.read_completed_at ?? null } : undefined}
    />
  );
}
