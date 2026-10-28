import { notFound } from "next/navigation";

import { LessonReader } from "@/components/lessons/lesson-reader";
import { loadPublicLesson } from "@/lib/lesson-repository";

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
  return <LessonReader lesson={lesson} />;
}
