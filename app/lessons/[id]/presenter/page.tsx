import { notFound } from "next/navigation";

import { PresenterView } from "@/components/slides/presenter-view";
import { loadPublicLesson } from "@/lib/lesson-repository";

interface PresenterPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

export default async function PresenterPage({ params, searchParams }: PresenterPageProps) {
  const { id } = await params;
  const { version } = await searchParams;
  const lesson = await loadPublicLesson(id, version);
  if (!lesson) {
    notFound();
  }
  return <PresenterView lesson={lesson} />;
}
