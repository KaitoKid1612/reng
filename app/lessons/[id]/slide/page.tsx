import { notFound } from "next/navigation";

import { SlideDeck } from "@/components/slides/slide-deck";
import { loadAccessibleLesson } from "@/lib/server/lesson-access";

import type { Metadata } from "next";

// Presentation views duplicate the reader and are not meant for search results.
export const metadata: Metadata = { title: "Trình chiếu", robots: { index: false, follow: false } };

interface SlidePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string; "print-pdf"?: string }>;
}

export default async function SlidePage({ params, searchParams }: SlidePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const lesson = await loadAccessibleLesson(id, query.version);
  if (!lesson) {
    notFound();
  }
  return <SlideDeck lesson={lesson} printMode={query["print-pdf"] !== undefined} />;
}
