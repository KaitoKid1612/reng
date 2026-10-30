import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { listPublicLessons } from "@/lib/lesson-repository";
import { isPublicTeachingLesson, LANGUAGE_LABELS } from "@/lib/teaching-content";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bài học",
  description:
    "Bài học công khai trên Reng: đọc bài, xem slide và luyện tập tiếng Nhật, tiếng Trung cho người Việt mới bắt đầu.",
  alternates: { canonical: "/lessons" },
};
export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const lessons = await listPublicLessons();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Bài học nhập môn</h1>
          <p>Từ những câu chào đầu tiên đến cách nói về cuộc sống mỗi ngày.</p>
        </div>
        <Link href="/grammar" className={buttonVariants({ variant: "outline" })}>
          Tra ngữ pháp
        </Link>
      </div>
      <div className="lesson-list">
        {lessons.map((lesson) => (
          <article className="lesson-card" key={lesson.id}>
            {isPublicTeachingLesson(lesson) ? (
              <p className="lesson-language">
                {LANGUAGE_LABELS[lesson.content.context.languageTag]}
              </p>
            ) : (
              <p lang="ja" className="lesson-japanese-title">
                {lesson.titleJa}
              </p>
            )}
            <h2>{lesson.title}</h2>
            <p>{lesson.summary}</p>
            <p className="small muted">
              {lesson.content.vocab.length} từ vựng, {lesson.content.grammar.length} mẫu câu
              {lesson.isSample ? ", bài mẫu chờ duyệt" : ""}
            </p>
            <div className="button-row">
              <Link
                href={`/lessons/${lesson.lessonId}?version=${lesson.id}`}
                className={buttonVariants()}
              >
                Đọc bài
              </Link>
              <Link
                href={`/lessons/${lesson.lessonId}/slide?version=${lesson.id}#1`}
                className={buttonVariants({ variant: "outline" })}
              >
                Trình chiếu
              </Link>
            </div>
          </article>
        ))}
      </div>
      {lessons.length === 0 && (
        <p>
          Chưa có bài học công khai. Bài của lớp nằm ở <Link href="/classes">Lớp của tôi</Link>{" "}
          (hoặc <Link href="/join-class">vào lớp bằng mã</Link> giáo viên gửi). Mới bắt đầu tiếng
          Nhật? Học <Link href="/kana">bảng chữ cái</Link> trước.
        </p>
      )}
    </>
  );
}
