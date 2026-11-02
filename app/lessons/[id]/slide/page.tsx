import { notFound } from "next/navigation";
import { z } from "zod";

import { SlideDeck } from "@/components/slides/slide-deck";
import { loadAccessibleLesson } from "@/lib/server/lesson-access";

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
    notFound();
  }
  // The class only shapes a link back to its own page, where access is checked again.
  const classId = z.uuid().safeParse(query.class).data;
  return (
    <SlideDeck lesson={lesson} printMode={query["print-pdf"] !== undefined} classId={classId} />
  );
}
