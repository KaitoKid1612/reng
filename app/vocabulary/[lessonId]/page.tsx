import Link from "next/link";
import { notFound } from "next/navigation";

import { FlashcardDeck } from "@/components/review/flashcard-deck";
import { getCurrentAccount } from "@/lib/server/account";
import { getVocabularyDeck } from "@/lib/server/reviews";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Flashcard từ vựng" };
export const dynamic = "force-dynamic";

interface VocabularyPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function VocabularyPage({ params }: VocabularyPageProps) {
  const { lessonId } = await params;
  const account = await getCurrentAccount();
  const isStudent = account !== null;
  const deck = await getVocabularyDeck(isStudent ? account.id : null, lessonId);
  if (!deck) {
    notFound();
  }
  return (
    <div className="narrow-page">
      {deck.titleJa ? (
        <p lang="ja" className="lesson-japanese-title">
          {deck.titleJa}
        </p>
      ) : (
        <p className="lesson-language">{deck.languageLabel}</p>
      )}
      <h1>Flashcard: {deck.title}</h1>
      <p className="muted">
        Nhìn chữ, đoán nghĩa rồi lật thẻ.{" "}
        {isStudent ? "Chấm mức nhớ để Reng hẹn ngày ôn lại." : "Không cần tài khoản để lật thẻ."}
      </p>
      {deck.isSample && (
        <p className="sample-notice">Bài mẫu đang chờ giảng viên duyệt nội dung và phát âm.</p>
      )}
      <FlashcardDeck lessonId={deck.lessonId} cards={deck.cards} canSchedule={isStudent} />
      <p>
        <Link href={`/lessons/${deck.lessonId}?version=${deck.versionId}`}>Đọc lại bài học</Link>
      </p>
    </div>
  );
}
