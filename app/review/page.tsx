import Link from "next/link";

import { ReviewSession } from "@/components/review/review-session";
import { requireStudent } from "@/lib/server/account";
import { getStudyActivity } from "@/lib/server/learner";
import { listDueCards } from "@/lib/server/reviews";
import { countStudyStreak, toStudyDay } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ôn tập hôm nay" };

export default async function ReviewPage() {
  const account = await requireStudent("/review");
  const now = new Date();
  const [cards, activity] = await Promise.all([
    listDueCards(account.id, now),
    getStudyActivity(account.id),
  ]);
  const today = toStudyDay(now);
  return (
    <div className="narrow-page">
      <h1>Ôn tập hôm nay</h1>
      <p className="muted">
        {cards.length
          ? `${cards.length} thẻ cần ôn: từ vựng tự đánh giá, câu trong sổ lỗi thì trả lời lại.`
          : "Hết thẻ cần ôn hôm nay."}
      </p>
      {cards.length ? (
        <ReviewSession
          cards={cards}
          streak={countStudyStreak(activity, now)}
          hasStudiedToday={activity.some((instant) => toStudyDay(instant) === today)}
        />
      ) : (
        <p>
          Thêm thẻ mới bằng flashcard trong <Link href="/classes">bài học của lớp</Link>, hoặc xem{" "}
          <Link href="/mistakes">sổ lỗi</Link>.
        </p>
      )}
    </div>
  );
}
