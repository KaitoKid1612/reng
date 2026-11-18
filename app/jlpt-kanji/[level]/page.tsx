import Link from "next/link";

import { JlptKanjiList } from "@/components/kanji/jlpt-kanji-list";
import { SubjectStudyNav } from "@/components/self-study/subject-study-nav";
import { buttonVariants } from "@/components/ui/button";
import { isKanjiLevel, KANJI_LEVEL_LABELS, KANJI_LEVELS } from "@/lib/jlpt-kanji";
import { KANJI_LEVEL_DATA } from "@/lib/kanji-data";

import type { Metadata } from "next";

interface JlptKanjiPageProps {
  params: Promise<{ level: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return KANJI_LEVELS.map((level) => ({ level }));
}

export async function generateMetadata({ params }: JlptKanjiPageProps): Promise<Metadata> {
  const { level } = await params;
  const label = isKanjiLevel(level) ? KANJI_LEVEL_LABELS[level] : "";
  return {
    title: `Kanji ${label} cho người Việt: âm Hán Việt và mẹo nhớ`,
    description: `Toàn bộ kanji thường gặp ở JLPT ${label}, chia nhóm, kèm âm Hán Việt, âm On, âm Kun, từ ví dụ, mẹo nhớ và chữ đã ra trong đề mẫu chính thức.`,
    alternates: { canonical: `/jlpt-kanji/${level}` },
  };
}

export default async function JlptKanjiPage({ params }: JlptKanjiPageProps) {
  const { level } = await params;
  if (!isKanjiLevel(level)) {
    return null;
  }
  const data = KANJI_LEVEL_DATA[level];
  const label = KANJI_LEVEL_LABELS[level];
  const asked = data.items.filter((item) => item.paper).length;
  return (
    <>
      <SubjectStudyNav subjectId="japanese" currentHref="/jlpt-kanji/n5" />
      <div className="page-heading">
        <div>
          <h1>Kanji {label} cho người Việt</h1>
          <p>
            {data.items.length} chữ chia thành {data.groups.length} nhóm. Người Việt có lợi thế âm
            Hán Việt: nhớ âm Hán Việt là đoán được nghĩa, và nhiều chữ có âm On gần với âm Hán Việt
            (<span lang="ja">学</span> HỌC → <span lang="ja">がく</span>, <span lang="ja">国</span>{" "}
            QUỐC → <span lang="ja">こく</span>). Học từng nhóm, đọc mẹo nhớ, rồi bấm Luyện nhóm này.
          </p>
        </div>
        <Link href={`/jlpt-kanji/${level}/practice`} className={buttonVariants()}>
          Luyện kanji {label}
        </Link>
      </div>
      <nav className="kanji-level-switch" aria-label="Cấp độ">
        {KANJI_LEVELS.map((item) => (
          <Link
            key={item}
            href={`/jlpt-kanji/${item}`}
            aria-current={item === level ? "page" : undefined}
          >
            Kanji {KANJI_LEVEL_LABELS[item]}
          </Link>
        ))}
      </nav>
      <p className="kanji-note">
        Từ 2010, JLPT không công bố danh sách kanji chính thức; đây là các chữ thường dạy cho{" "}
        {label}
        {level === "n4" ? ", học sau 105 chữ N5" : ""}. Đề thi chỉ hỏi kanji trong phần Chữ và từ
        vựng: <span lang="ja">もんだい1</span> cho từ viết bằng kanji, chọn cách đọc;{" "}
        <span lang="ja">もんだい2</span> cho cách đọc, chọn kanji. Thẻ{" "}
        <span className="kanji-paper-badge">Đã ra đề</span> đánh dấu {asked} chữ mà hai đề mẫu chính
        thức (2012, 2018) trên jlpt.jp đã hỏi.
      </p>
      <JlptKanjiList data={data} practiceHref={`/jlpt-kanji/${level}/practice`} />
    </>
  );
}
