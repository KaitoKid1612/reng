import { notFound } from "next/navigation";

import { SlideDeck } from "@/components/slides/slide-deck";
import { loadPublicLesson } from "@/lib/lesson-repository";

interface SlidePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string; "print-pdf"?: string }>;
}

export default async function SlidePage({ params, searchParams }: SlidePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const lesson = await loadPublicLesson(id, query.version);
  if (!lesson) {
    notFound();
  }
  return <SlideDeck lesson={lesson} printMode={query["print-pdf"] !== undefined} />;
}
