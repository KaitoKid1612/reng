import { GrammarSearch } from "@/components/lessons/grammar-search";
import { listPublicLessons } from "@/lib/lesson-repository";
import { isPublicTeachingLesson } from "@/lib/teaching-content";

import type { PublicLesson } from "@/lib/lesson-schema";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tra cứu ngữ pháp" };
export const dynamic = "force-dynamic";

export default async function GrammarPage() {
  // Grammar search indexes the Japanese v1 grammar fields.
  const lessons = (await listPublicLessons()).filter(
    (lesson): lesson is PublicLesson => !isPublicTeachingLesson(lesson),
  );
  return <GrammarSearch lessons={lessons} />;
}
