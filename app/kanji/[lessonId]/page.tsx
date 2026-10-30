import Link from "next/link";
import { notFound } from "next/navigation";

import { KanjiPractice } from "@/components/kanji/kanji-practice";
import { buttonVariants } from "@/components/ui/button";
import { extractKanjiWords } from "@/lib/kanji-practice";
import { loadAccessibleLessonVersion } from "@/lib/server/lesson-access";
import { isTeachingVersion } from "@/lib/teaching-content";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Luyện kanji" };

interface KanjiPageProps {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
}

export default async function KanjiPage({ params, searchParams }: KanjiPageProps) {
  const { lessonId } = await params;
  const { version: versionParam } = await searchParams;
  const versionId = typeof versionParam === "string" ? versionParam : undefined;
  const version = await loadAccessibleLessonVersion(lessonId, versionId);
  if (!version) {
    notFound();
  }
  // Kanji practice is for Japanese lessons; Chinese lessons keep their own vocabulary tools.
  const words = isTeachingVersion(version) ? [] : extractKanjiWords(version.content.vocab);
  return (
    <>
      <div className="page-heading">
        <div>
          {!isTeachingVersion(version) && (
            <p lang="ja" className="lesson-japanese-title">
              {version.titleJa}
            </p>
          )}
          <h1>Luyện kanji: {version.title}</h1>
          <p>
            Luyện các từ viết bằng chữ Hán trong bài: đọc chữ, nhận mặt chữ và hiểu nghĩa. Cách đọc
            đúng là cách đọc giảng viên ghi trong bài.
          </p>
        </div>
        <Link
          href={`/lessons/${version.lessonId}?version=${version.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Về bài học
        </Link>
      </div>
      {words.length ? (
        <KanjiPractice words={words} />
      ) : (
        <p className="notice-panel">Bài này chưa có từ vựng viết bằng chữ Hán để luyện.</p>
      )}
    </>
  );
}
