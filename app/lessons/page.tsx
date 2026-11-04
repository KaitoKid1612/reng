import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { listPublicLessons } from "@/lib/lesson-repository";
import { isPublicTeachingLesson, LANGUAGE_LABELS } from "@/lib/teaching-content";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bài học",
  description:
    "Bài học công khai trên Reng: đọc bài, xem slide và luyện tập theo từng bài, chưa cần vào lớp.",
  alternates: { canonical: "/lessons" },
};
export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const lessons = await listPublicLessons();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Bài học công khai</h1>
          <p>
            Đọc bài và xem slide các bài giáo viên đã công khai trên Reng. Bài của lớp bạn nằm ở{" "}
            <Link href="/classes">Lớp của tôi</Link>.
          </p>
        </div>
        <Link href="/self-study" className={buttonVariants({ variant: "outline" })}>
          Công cụ tự học theo môn
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
              {lesson.isSample ? ", bài mẫu tự biên soạn" : ""}
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
        <>
          <p>
            Chưa có bài học công khai. Có mã lớp? <Link href="/join-class">Vào lớp bằng mã</Link>{" "}
            giáo viên gửi, hoặc luyện tập với <Link href="/self-study">công cụ tự học</Link> của
            từng môn.
          </p>
          <p className="small muted">
            Bạn là giáo viên? Sau khi <Link href="/sign-up/teacher">đăng ký giáo viên</Link>, bạn có
            sẵn bài mẫu theo trình tự Minna no Nihongo để sửa, trình chiếu và giao bài.
          </p>
        </>
      )}
    </>
  );
}
