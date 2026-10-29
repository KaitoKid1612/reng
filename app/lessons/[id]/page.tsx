import { notFound } from "next/navigation";
import { cache } from "react";

import { LessonReader } from "@/components/lessons/lesson-reader";
import { TeachingReader } from "@/components/teaching/teaching-reader";
import { isDatabaseLessonSource } from "@/lib/lesson-repository";
import { describeLessonForSearch, lessonJsonLd } from "@/lib/lesson-seo";
import { loadAccessibleLesson } from "@/lib/server/lesson-access";
import { getCurrentAccount } from "@/lib/server/account";
import { getLessonProgress } from "@/lib/server/learner";
import { serializeJsonLd } from "@/lib/site";
import { isPublicTeachingLesson } from "@/lib/teaching-content";

import type { Metadata } from "next";

interface LessonPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

// Metadata and the page read the same lesson once per request.
const loadLesson = cache((id: string, version?: string) => loadAccessibleLesson(id, version));

export async function generateMetadata({
  params,
  searchParams,
}: LessonPageProps): Promise<Metadata> {
  const { id } = await params;
  const { version } = await searchParams;
  const lesson = await loadLesson(id, version);
  if (!lesson) {
    return { title: "Không tìm thấy bài học", robots: { index: false, follow: false } };
  }
  const description = describeLessonForSearch(lesson);
  const path = `/lessons/${lesson.lessonId}`;
  return {
    title: lesson.title,
    description,
    // Version links show the same lesson; search engines index the lesson URL only.
    alternates: { canonical: path },
    openGraph: { title: lesson.title, description, url: path, type: "article" },
  };
}

export default async function LessonPage({ params, searchParams }: LessonPageProps) {
  const { id } = await params;
  const { version } = await searchParams;
  const lesson = await loadLesson(id, version);
  if (!lesson) {
    notFound();
  }
  // Reading progress references database lessons, so local samples have no tracker.
  const account = isDatabaseLessonSource() ? await getCurrentAccount() : null;
  const progress =
    account !== null
      ? { completedAt: (await getLessonProgress(account.id, id))?.read_completed_at ?? null }
      : null;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(lessonJsonLd(lesson)) }}
      />
      {isPublicTeachingLesson(lesson) ? (
        <TeachingReader lesson={lesson} progress={progress} />
      ) : (
        <LessonReader lesson={lesson} progress={progress} />
      )}
    </>
  );
}
