import Link from "next/link";

import { KanjiPractice } from "@/components/kanji/kanji-practice";
import { SubjectStudyNav } from "@/components/self-study/subject-study-nav";
import { buttonVariants } from "@/components/ui/button";
import { isKanjiLevel, KANJI_LEVEL_LABELS, KANJI_LEVELS, practiceWordsOf } from "@/lib/jlpt-kanji";
import { KANJI_LEVEL_DATA } from "@/lib/kanji-data";

import type { Metadata } from "next";

interface PracticePageProps {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ group?: string | string[] }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return KANJI_LEVELS.map((level) => ({ level }));
}

export async function generateMetadata({ params }: PracticePageProps): Promise<Metadata> {
  const { level } = await params;
  const label = isKanjiLevel(level) ? KANJI_LEVEL_LABELS[level] : "";
  return {
    title: `Luyện kanji ${label} theo dạng đề JLPT`,
    description: `Luyện đọc và viết kanji ${label} theo từng nhóm: nhìn từ gõ cách đọc, chọn kanji đúng, chọn nghĩa tiếng Việt.`,
    alternates: { canonical: `/jlpt-kanji/${level}/practice` },
  };
}

export default async function JlptKanjiPracticePage({ params, searchParams }: PracticePageProps) {
  const { level } = await params;
  if (!isKanjiLevel(level)) {
    return null;
  }
  const groupParam = (await searchParams).group;
  const data = KANJI_LEVEL_DATA[level];
  const group = data.groups.find((item) => item.id === groupParam);
  const label = KANJI_LEVEL_LABELS[level];
  const base = `/jlpt-kanji/${level}/practice`;
  const words = practiceWordsOf(data, group?.id);
  return (
    <>
      <SubjectStudyNav subjectId="japanese" currentHref="/jlpt-kanji/n5" />
      <div className="page-heading">
        <div>
          <h1>
            Luyện kanji {label}: {group ? group.title : "tất cả các nhóm"}
          </h1>
          <p>
            Giống phần chữ Hán của đề JLPT: đọc chữ là nhìn từ viết bằng kanji rồi gõ cách đọc (
            <span lang="ja">もんだい1</span>), nhận mặt chữ là chọn kanji đúng cho từ (
            <span lang="ja">もんだい2</span>). {words.length} từ.
          </p>
        </div>
        <Link
          href={`/jlpt-kanji/${level}${group ? `#${group.id}` : ""}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Xem mẹo nhớ
        </Link>
      </div>
      <nav className="kanji-group-nav" aria-label="Chọn nhóm để luyện">
        <ul>
          <li>
            <Link href={base} aria-current={group ? undefined : "page"}>
              Tất cả
            </Link>
          </li>
          {data.groups.map((item) => (
            <li key={item.id}>
              <Link
                href={`${base}?group=${item.id}`}
                aria-current={item.id === group?.id ? "page" : undefined}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <KanjiPractice key={group?.id ?? "all"} words={words} lang="ja" />
    </>
  );
}
