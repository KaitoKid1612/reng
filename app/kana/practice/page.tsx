import { KanaPractice } from "@/components/kana/kana-practice";
import { SubjectStudyNav } from "@/components/self-study/subject-study-nav";
import { kanaItems } from "@/lib/data";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luyện đọc Hiragana và Katakana",
  description:
    "Luyện đọc kana bằng romaji theo phiên ngắn mười câu, xem kết quả ngay và luyện lại chữ còn nhầm.",
  alternates: { canonical: "/kana/practice" },
};
interface PracticePageProps {
  searchParams: Promise<{ script?: string }>;
}

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const query = await searchParams;
  return (
    <>
      <SubjectStudyNav subjectId="japanese" currentHref="/kana/practice" />
      <KanaPractice
        items={kanaItems}
        initialScript={query.script === "katakana" ? "katakana" : "hiragana"}
      />
    </>
  );
}
