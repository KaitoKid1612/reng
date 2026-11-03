import { PinyinPractice } from "@/components/self-study/pinyin-practice";
import { SubjectStudyNav } from "@/components/self-study/subject-study-nav";
import { PINYIN_WORDS } from "@/lib/pinyin-study";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luyện gõ pinyin",
  description:
    "Luyện gõ pinyin có dấu thanh cho từ tiếng Trung thông dụng, gõ số thanh trên điện thoại, xem kết quả ngay và luyện lại từ sai.",
  alternates: { canonical: "/pinyin/practice" },
};

export default function PinyinPracticePage() {
  return (
    <>
      <SubjectStudyNav subjectId="chinese" currentHref="/pinyin/practice" />
      <PinyinPractice words={PINYIN_WORDS} />
    </>
  );
}
