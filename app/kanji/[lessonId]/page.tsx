import Link from "next/link";

import { KanjiPractice } from "@/components/kanji/kanji-practice";
import { buttonVariants } from "@/components/ui/button";
import { extractHanziWords, extractKanjiWords } from "@/lib/kanji-practice";
import { loadAccessibleLessonVersion, lessonNotFound } from "@/lib/server/lesson-access";
import { isTeachingVersion } from "@/lib/teaching-content";

import type { Metadata } from "next";

// Japanese lessons practise kanji, Chinese lessons hanzi with pinyin.
export const metadata: Metadata = { title: "Luyện chữ Hán và kanji" };

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
    return lessonNotFound(`/kanji/${lessonId}${versionId ? `?version=${versionId}` : ""}`);
  }
  const isChinese = isTeachingVersion(version);
  const lang = isChinese ? version.content.context.languageTag : "ja";
  const words = isChinese
    ? extractHanziWords(version.content.vocab, version.content.context.languageTag)
    : extractKanjiWords(version.content.vocab);
  const scriptName = isChinese ? "chữ Hán" : "kanji";
  return (
    <>
      <div className="page-heading">
        <div>
          {!isTeachingVersion(version) && (
            <p lang="ja" className="lesson-japanese-title">
              {version.titleJa}
            </p>
          )}
          <h1>
            Luyện {scriptName}: {version.title}
          </h1>
          <p>
            Luyện các từ viết bằng chữ Hán trong bài: đọc chữ, nhận mặt chữ và hiểu nghĩa. Cách đọc
            đúng là {isChinese ? "pinyin" : "cách đọc"} giảng viên ghi trong bài.
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
        <KanjiPractice words={words} lang={lang} />
      ) : (
        <p className="notice-panel">Bài này chưa có từ vựng viết bằng chữ Hán để luyện.</p>
      )}
    </>
  );
}
