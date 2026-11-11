import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { PracticeScore } from "@/components/ui/score-ring";

import type { PracticeMistake } from "@/lib/kana";

interface PracticeResultProps {
  mistakes: PracticeMistake[];
  totalCount: number;
  bestStreak: number;
  onRetryMistakes: () => void;
  onReset: () => void;
}

export function PracticeResult({
  mistakes,
  totalCount,
  bestStreak,
  onRetryMistakes,
  onReset,
}: PracticeResultProps) {
  return (
    <div className="practice-result">
      <h1>Bạn đã hoàn thành phiên luyện</h1>
      <PracticeScore
        correctCount={totalCount - mistakes.length}
        totalCount={totalCount}
        unit="câu đúng"
        bestStreak={bestStreak}
      />
      <p>
        {mistakes.length > 0
          ? "Ôn lại những chữ dưới đây để nhớ chắc hơn."
          : "Bạn đã đọc đúng tất cả các chữ trong phiên này."}
      </p>
      {mistakes.length > 0 && (
        // One tile per character, like a page of flashcards to look over before the retry.
        <ul className="mistake-list mistake-tiles">
          {mistakes.map(({ item, raw }) => (
            <li key={item.id}>
              <span lang="ja" className="kana-font">
                {item.kana}
              </span>
              <strong>{item.acceptedRomaji.join(" / ")}</strong>
              <span className="small muted">Bạn nhập: {raw}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="button-row">
        {mistakes.length > 0 && <Button onClick={onRetryMistakes}>Luyện lại câu sai</Button>}
        <Button variant="outline" onClick={onReset}>
          Chọn phiên mới
        </Button>
        <Link href="/kana" className={buttonVariants({ variant: "ghost" })}>
          Xem lại bảng chữ
        </Link>
        <Link href="/join-class" className={buttonVariants({ variant: "ghost" })}>
          Có mã lớp? Vào lớp
        </Link>
      </div>
    </div>
  );
}
