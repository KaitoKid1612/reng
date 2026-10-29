import { notFound } from "next/navigation";

import { LessonReader } from "@/components/lessons/lesson-reader";
import { TeachingReader } from "@/components/teaching/teaching-reader";
import { isDatabaseLessonSource } from "@/lib/lesson-repository";
import { loadAccessibleLesson } from "@/lib/server/lesson-access";
import { getCurrentAccount } from "@/lib/server/account";
import { getLessonProgress } from "@/lib/server/learner";
import { isPublicTeachingLesson } from "@/lib/teaching-content";

interface LessonPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

export default async function LessonPage({ params, searchParams }: LessonPageProps) {
  const { id } = await params;
  const { version } = await searchParams;
  const lesson = await loadAccessibleLesson(id, version);
  if (!lesson) {
    notFound();
  }
  // Reading progress references database lessons, so local samples have no tracker.
  const account = isDatabaseLessonSource() ? await getCurrentAccount() : null;
  const progress =
    account !== null
      ? { completedAt: (await getLessonProgress(account.id, id))?.read_completed_at ?? null }
      : null;
  return isPublicTeachingLesson(lesson) ? (
    <TeachingReader lesson={lesson} progress={progress} />
  ) : (
    <LessonReader lesson={lesson} progress={progress} />
  );
}
