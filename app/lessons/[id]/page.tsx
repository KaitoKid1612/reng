import { notFound } from "next/navigation";

import { LessonReader } from "@/components/lessons/lesson-reader";
import { isDatabaseLessonSource, loadPublicLesson } from "@/lib/lesson-repository";
import { getCurrentAccount } from "@/lib/server/account";
import { getLessonProgress } from "@/lib/server/learner";

interface LessonPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

export default async function LessonPage({ params, searchParams }: LessonPageProps) {
  const { id } = await params;
  const { version } = await searchParams;
  const lesson = await loadPublicLesson(id, version);
  if (!lesson) {
    notFound();
  }
  // Reading progress references database lessons, so local samples have no tracker.
  const account = isDatabaseLessonSource() ? await getCurrentAccount() : null;
  const progress =
    account?.role === "student"
      ? { completedAt: (await getLessonProgress(account.id, id))?.read_completed_at ?? null }
      : null;
  return <LessonReader lesson={lesson} progress={progress} />;
}
