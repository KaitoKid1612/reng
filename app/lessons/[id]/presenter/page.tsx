import { notFound } from "next/navigation";

import { PresenterView } from "@/components/slides/presenter-view";
import { loadAccessibleLesson } from "@/lib/server/lesson-access";

interface PresenterPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

export default async function PresenterPage({ params, searchParams }: PresenterPageProps) {
  const { id } = await params;
  const { version } = await searchParams;
  const lesson = await loadAccessibleLesson(id, version);
  if (!lesson) {
    notFound();
  }
  return <PresenterView lesson={lesson} />;
}
