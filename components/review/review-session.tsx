"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { AnswerFeedback } from "@/components/classroom/answer-feedback";
import { QuestionField } from "@/components/classroom/question-field";
import { RatingButtons } from "@/components/review/rating-buttons";
import { REVIEW_FAILURES, sendReview } from "@/components/review/review-request";
import { VocabCardFace } from "@/components/review/vocab-card-face";
import { Button } from "@/components/ui/button";
import { isBlankAnswer } from "@/lib/grading/raw-answer";

import type { ReviewRequest } from "@/components/review/review-request";
import type { RawAnswer } from "@/lib/grading/raw-answer";
import type { ReviewRating } from "@/lib/review-ratings";
import type { ReviewCard } from "@/lib/server/reviews";

interface ReviewSessionProps {
  cards: ReviewCard[];
  streak: number;
  hasStudiedToday: boolean;
}

interface MistakeOutcome {
  isCorrect: boolean;
  correctText: string;
  explain: string;
  correctStreak: number;
  isResolved: boolean;
}

function parseMistakeOutcome(data: Record<string, unknown>): MistakeOutcome | null {
  const { isCorrect, correctText, explain, correctStreak, isResolved } = data;
  if (
    typeof isCorrect !== "boolean" ||
    typeof correctText !== "string" ||
    typeof explain !== "string" ||
    typeof correctStreak !== "number" ||
    typeof isResolved !== "boolean"
  ) {
    return null;
  }
  return { isCorrect, correctText, explain, correctStreak, isResolved };
}

export function ReviewSession({ cards, streak, hasStudiedToday }: ReviewSessionProps) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [answer, setAnswer] = useState<RawAnswer | undefined>(undefined);
  const [outcome, setOutcome] = useState<MistakeOutcome | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const requestIdRef = useRef<string | null>(null);
  const card = cards[index];

  function handleNext() {
    requestIdRef.current = null;
    setIndex((value) => value + 1);
    setIsFlipped(false);
    setAnswer(undefined);
    setOutcome(null);
    setMessage("");
  }

  async function send(request: ReviewRequest) {
    requestIdRef.current ??= crypto.randomUUID();
    setIsSending(true);
    setMessage("");
    const response = await sendReview(requestIdRef.current, request);
    setIsSending(false);
    if (response.status === "ok") {
      requestIdRef.current = null;
      setReviewedCount((value) => value + 1);
      return response.data;
    }
    setMessage(REVIEW_FAILURES[response.status]);
    if (response.status === "conflict" || response.status === "not_due") {
      requestIdRef.current = null;
    }
    return null;
  }

  async function handleRate(rating: ReviewRating) {
    if (card?.kind !== "vocab") {
      return;
    }
    const data = await send({
      kind: "vocab",
      lessonId: card.lessonId,
      vocabId: card.vocab.id,
      rating,
      revision: card.revision,
    });
    if (data) {
      handleNext();
    }
  }

  async function handleAnswer() {
    if (card?.kind !== "mistake") {
      return;
    }
    const data = await send({
      kind: "mistake",
      assignmentId: card.assignmentId,
      questionId: card.view.id,
      answer,
      revision: card.revision,
    });
    const parsed = data ? parseMistakeOutcome(data) : null;
    if (parsed) {
      setOutcome(parsed);
      if (parsed.isCorrect) {
        setCorrectCount((value) => value + 1);
      }
    }
  }

  if (!card) {
    const finalStreak = reviewedCount > 0 && !hasStudiedToday ? streak + 1 : streak;
    return (
      <div className="form-card" role="status">
        <h2>Xong phiên ôn hôm nay</h2>
        <p>
          Bạn đã ôn {reviewedCount} thẻ
          {correctCount > 0 ? `, trả lời đúng ${correctCount} câu trong sổ lỗi` : ""}.
        </p>
        <p className="result-score">
          {finalStreak}
          <span> ngày học liên tiếp</span>
        </p>
        <Link href="/classes">Về lớp của tôi</Link>
      </div>
    );
  }

  return (
    <section aria-labelledby="review-card-title">
      <p id="review-card-title" className="question-meta">
        <span>
          Thẻ {index + 1} / {cards.length}
        </span>
        <span>
          {card.kind === "vocab"
            ? `Từ vựng: ${card.lessonTitle}`
            : `Sổ lỗi: ${card.assignmentTitle}`}
        </span>
      </p>
      {card.kind === "vocab" ? (
        <>
          <VocabCardFace lessonId={card.lessonId} vocab={card.vocab} isFlipped={isFlipped} />
          {isFlipped ? (
            <RatingButtons isDisabled={isSending} onRate={handleRate} />
          ) : (
            <Button className="full-width" onClick={() => setIsFlipped(true)}>
              Lật thẻ
            </Button>
          )}
        </>
      ) : (
        <div className="question-card">
          <QuestionField
            view={card.view}
            position={index + 1}
            total={cards.length}
            value={answer}
            isLocked={outcome !== null || isSending}
            onAnswerChange={setAnswer}
          />
          {outcome ? (
            <>
              <AnswerFeedback
                isCorrect={outcome.isCorrect}
                correctText={outcome.correctText}
                explain={outcome.explain}
              />
              <p className="small muted">
                {outcome.isResolved
                  ? "Đã đúng 3 lần liên tiếp: câu này được đánh dấu đã giải quyết."
                  : `Chuỗi đúng: ${outcome.correctStreak}/3.`}
              </p>
              <Button onClick={handleNext}>Thẻ tiếp theo</Button>
            </>
          ) : (
            <Button disabled={isSending || isBlankAnswer(answer)} onClick={handleAnswer}>
              {isSending ? "Đang chấm…" : "Trả lời"}
            </Button>
          )}
        </div>
      )}
      {message && (
        <div className="notice-panel" role="alert">
          <p>{message}</p>
          <Button variant="ghost" onClick={handleNext}>
            Bỏ qua thẻ này
          </Button>
        </div>
      )}
    </section>
  );
}
