import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { listPublicLessons } from "@/lib/lesson-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bài học" };
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
            <p lang="ja" className="lesson-japanese-title">
              {lesson.titleJa}
            </p>
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
          Chưa có bài học xuất bản. Bạn có thể bắt đầu với <Link href="/kana">bảng chữ cái</Link>.
        </p>
      )}
    </>
  );
}
