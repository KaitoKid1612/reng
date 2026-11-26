import Link from "next/link";

import { SubjectStudyNav } from "@/components/self-study/subject-study-nav";
import { buttonVariants } from "@/components/ui/button";
import { JlptVocabList } from "@/components/vocab/jlpt-vocab-list";
import { isVocabLevel, VOCAB_LEVEL_LABELS, VOCAB_LEVELS } from "@/lib/jlpt-vocab";
import { VOCAB_LEVEL_DATA } from "@/lib/vocab-data";

import type { Metadata } from "next";

interface JlptVocabPageProps {
  params: Promise<{ level: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return VOCAB_LEVELS.map((level) => ({ level }));
}

export async function generateMetadata({ params }: JlptVocabPageProps): Promise<Metadata> {
  const { level } = await params;
  const label = isVocabLevel(level) ? VOCAB_LEVEL_LABELS[level] : "";
  return {
    title: `Từ vựng ${label} theo chủ đề cho người Việt`,
    description: `Từ vựng JLPT ${label} chia theo chủ đề, kèm nghĩa, âm Hán Việt, câu ví dụ kiểu đề thi, từ gần nghĩa và luyện điền từ như phần Từ vựng của đề.`,
    alternates: { canonical: `/jlpt-vocab/${level}` },
  };
}

export default async function JlptVocabPage({ params }: JlptVocabPageProps) {
  const { level } = await params;
  if (!isVocabLevel(level)) {
    return null;
  }
  const data = VOCAB_LEVEL_DATA[level];
  const label = VOCAB_LEVEL_LABELS[level];
  const asked = data.items.filter((item) => item.paper).length;
  return (
    <>
      <SubjectStudyNav subjectId="japanese" currentHref="/jlpt-vocab/n4" />
      <div className="page-heading">
        <div>
          <h1>Từ vựng {label} theo chủ đề</h1>
          <p>
            {data.items.length} từ, {data.groups.length} chủ đề. Mỗi từ có một câu ví dụ kiểu phần
            điền từ của đề (<span lang="ja">もんだい3</span>); từ gốc Hán có âm Hán Việt.
          </p>
        </div>
        <Link href={`/jlpt-vocab/${level}/practice`} className={buttonVariants()}>
          Luyện từ vựng {label}
        </Link>
      </div>
      <p className="kanji-note">
        Thẻ <span className="kanji-paper-badge">Đã ra đề</span>: {asked} từ hai đề mẫu chính thức{" "}
        {label} (2012, 2018) trên jlpt.jp đã hỏi. Câu ví dụ do Reng tự viết.
      </p>
      <JlptVocabList data={data} practiceHref={`/jlpt-vocab/${level}/practice`} />
    </>
  );
}
