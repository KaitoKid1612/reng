import Link from "next/link";

import { GrammarSearch } from "@/components/lessons/grammar-search";
import { listPublicLessons } from "@/lib/lesson-repository";
import { isPublicTeachingLesson } from "@/lib/teaching-content";

import type { PublicLesson } from "@/lib/lesson-schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tra cứu ngữ pháp",
  description:
    "Tra cứu mẫu câu tiếng Nhật trong các bài học công khai, kèm nghĩa tiếng Việt, giải thích và ví dụ.",
  alternates: { canonical: "/grammar" },
};
export const dynamic = "force-dynamic";

export default async function GrammarPage() {
  // Grammar search indexes the Japanese v1 grammar fields.
  const lessons = (await listPublicLessons()).filter(
    (lesson): lesson is PublicLesson => !isPublicTeachingLesson(lesson),
  );
  if (!lessons.length) {
    return (
      <div className="page-heading">
        <div>
          <h1>Tra cứu ngữ pháp</h1>
          <p>
            Chưa có bài học công khai để tra cứu. Mẫu câu của lớp nằm trong từng bài ở{" "}
            <Link href="/classes">Lớp của tôi</Link>.
          </p>
        </div>
      </div>
    );
  }
  return <GrammarSearch lessons={lessons} />;
}
