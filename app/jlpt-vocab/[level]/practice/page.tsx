import Link from "next/link";

import { SubjectStudyNav } from "@/components/self-study/subject-study-nav";
import { buttonVariants } from "@/components/ui/button";
import { VocabPractice } from "@/components/vocab/vocab-practice";
import { isVocabLevel, VOCAB_LEVEL_LABELS, VOCAB_LEVELS } from "@/lib/jlpt-vocab";
import { VOCAB_LEVEL_DATA } from "@/lib/vocab-data";

import type { Metadata } from "next";

interface PracticePageProps {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ group?: string | string[] }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return VOCAB_LEVELS.map((level) => ({ level }));
}

export async function generateMetadata({ params }: PracticePageProps): Promise<Metadata> {
  const { level } = await params;
  const label = isVocabLevel(level) ? VOCAB_LEVEL_LABELS[level] : "";
  return {
    title: `Luyện từ vựng ${label} theo dạng đề JLPT`,
    description: `Luyện từ vựng ${label} theo chủ đề: điền từ vào câu như đề thi, chọn từ gần nghĩa, chọn nghĩa tiếng Việt.`,
    alternates: { canonical: `/jlpt-vocab/${level}/practice` },
  };
}

export default async function JlptVocabPracticePage({ params, searchParams }: PracticePageProps) {
  const { level } = await params;
  if (!isVocabLevel(level)) {
    return null;
  }
  const groupParam = (await searchParams).group;
  const data = VOCAB_LEVEL_DATA[level];
  const group = data.groups.find((item) => item.id === groupParam);
  const label = VOCAB_LEVEL_LABELS[level];
  const base = `/jlpt-vocab/${level}/practice`;
  const items = group ? data.items.filter((item) => item.group === group.id) : data.items;
  return (
    <>
      <SubjectStudyNav subjectId="japanese" currentHref="/jlpt-vocab/n4" />
      <div className="page-heading">
        <div>
          <h1>
            Luyện từ vựng {label}: {group ? group.title : "tất cả chủ đề"}
          </h1>
          <p>
            Mặc định là hai dạng của phần Từ vựng trong đề: điền từ vào câu (
            <span lang="ja">もんだい3</span>), phương án sai cùng loại từ và cùng cách chia; chọn từ
            gần nghĩa (<span lang="ja">もんだい4</span>). {items.length} từ.
          </p>
        </div>
        <Link
          href={`/jlpt-vocab/${level}${group ? `#${group.id}` : ""}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Xem danh sách từ
        </Link>
      </div>
      <nav className="kanji-group-nav" aria-label="Chọn chủ đề để luyện">
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
      <VocabPractice key={group?.id ?? "all"} items={items} pool={data.items} />
    </>
  );
}
