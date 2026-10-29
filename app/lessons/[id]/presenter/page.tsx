import { notFound } from "next/navigation";

import { PresenterView } from "@/components/slides/presenter-view";
import { loadAccessibleLesson } from "@/lib/server/lesson-access";

import type { Metadata } from "next";

// Presentation views duplicate the reader and are not meant for search results.
export const metadata: Metadata = { title: "Presenter", robots: { index: false, follow: false } };

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
