"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { RatingButtons } from "@/components/review/rating-buttons";
import { REVIEW_FAILURES, sendReview } from "@/components/review/review-request";
import { VocabCardFace } from "@/components/review/vocab-card-face";
import { Button, buttonVariants } from "@/components/ui/button";
import { signInPath } from "@/lib/auth-paths";

import type { ReviewRating } from "@/lib/review-ratings";
import type { VocabDeckCard } from "@/lib/server/reviews";

interface FlashcardDeckProps {
  lessonId: string;
  // Ratings are checked against the version the cards come from.
  versionId: string;
  cards: VocabDeckCard[];
  canSchedule: boolean;
}

export function FlashcardDeck({ lessonId, versionId, cards, canSchedule }: FlashcardDeckProps) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [revisions, setRevisions] = useState(
    () => new Map(cards.map((card) => [card.vocab.id, card.revision])),
  );
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  // Cards rated in this visit. Once every card has a rating the deck ends instead of wrapping to
  // card 1, where a second rating would reschedule cards just learned.
  const [ratedIds, setRatedIds] = useState<ReadonlySet<string>>(() => new Set());
  const requestIdRef = useRef<string | null>(null);
  const card = cards[index % cards.length];

  function handleMove(step: number) {
    requestIdRef.current = null;
    setIndex((value) => (value + step + cards.length) % cards.length);
    setIsFlipped(false);
    setMessage("");
  }

  async function handleRate(rating: ReviewRating) {
    if (!card) {
      return;
    }
    requestIdRef.current ??= crypto.randomUUID();
    setIsSending(true);
    const response = await sendReview(requestIdRef.current, {
      kind: "vocab",
      lessonId,
      vocabId: card.vocab.id,
      rating,
      revision: revisions.get(card.vocab.id) ?? null,
      versionId,
    });
    setIsSending(false);
    if (response.status === "ok" && typeof response.data.revision === "number") {
      const revision = response.data.revision;
      setRevisions((current) => new Map(current).set(card.vocab.id, revision));
      const nextRated = new Set(ratedIds).add(card.vocab.id);
      setRatedIds(nextRated);
      if (nextRated.size < cards.length) {
        handleMove(1);
      }
      return;
    }
    if (response.status !== "ok") {
      setMessage(REVIEW_FAILURES[response.status]);
    }
  }

  if (!card) {
    return <p>Bài này chưa có từ vựng.</p>;
  }

  if (canSchedule && ratedIds.size >= cards.length) {
    return (
      <section aria-labelledby="deck-done-title" className="form-card">
        <h2 id="deck-done-title">Xong bộ thẻ</h2>
        <p>
          Bạn đã ôn xong {cards.length} thẻ của bài này. Reng đã lưu lịch ôn: thẻ nào đến hạn sẽ
          hiện ở Ôn tập.
        </p>
        <div className="button-row">
          <Link href="/review" className={buttonVariants()}>
            Ôn tập thẻ đến hạn
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setRatedIds(new Set());
              setIndex(0);
              setIsFlipped(false);
            }}
          >
            Xem lại từ đầu
          </Button>
          <Link href="/classes" className={buttonVariants({ variant: "ghost" })}>
            Về Lớp của tôi
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Flashcard từ vựng">
      <p className="question-meta">
        <span>
          Thẻ {(index % cards.length) + 1} / {cards.length}
        </span>
        <span>{revisions.get(card.vocab.id) ? "Đã có lịch ôn" : "Thẻ mới"}</span>
      </p>
      <VocabCardFace lessonId={lessonId} vocab={card.vocab} isFlipped={isFlipped} />
      {!isFlipped && (
        <Button className="full-width" onClick={() => setIsFlipped(true)}>
          Lật thẻ
        </Button>
      )}
      {isFlipped && canSchedule && <RatingButtons isDisabled={isSending} onRate={handleRate} />}
      {isFlipped && !canSchedule && (
        <p className="small muted">
          <Link href={signInPath(`/vocabulary/${lessonId}?version=${versionId}`)}>
            Đăng nhập tài khoản học viên
          </Link>{" "}
          để lưu lịch ôn theo FSRS.
        </p>
      )}
      {message && (
        <p className="error-text" role="alert">
          {message}
        </p>
      )}
      <div className="question-nav-always">
        <Button variant="outline" onClick={() => handleMove(-1)}>
          Thẻ trước
        </Button>
        <Button variant="outline" onClick={() => handleMove(1)}>
          Thẻ sau
        </Button>
      </div>
    </section>
  );
}
