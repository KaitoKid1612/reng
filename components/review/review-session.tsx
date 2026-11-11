"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AnswerFeedback } from "@/components/classroom/answer-feedback";
import { QuestionField } from "@/components/classroom/question-field";
import { StreakCard } from "@/components/progress/streak-card";
import { RatingButtons } from "@/components/review/rating-buttons";
import { REVIEW_FAILURES, sendReview } from "@/components/review/review-request";
import { VocabCardFace } from "@/components/review/vocab-card-face";
import { Button, buttonVariants } from "@/components/ui/button";
import { Celebration } from "@/components/ui/score-ring";
import { answerLang } from "@/lib/assignment";
import { isBlankAnswer } from "@/lib/grading/raw-answer";
import { describeStreak, STREAK_MILESTONES } from "@/lib/study-streak";

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
  transcript: string | null;
  correctStreak: number;
  isResolved: boolean;
}

function parseMistakeOutcome(data: Record<string, unknown>): MistakeOutcome | null {
  const { isCorrect, correctText, explain, transcript, correctStreak, isResolved } = data;
  if (
    typeof isCorrect !== "boolean" ||
    typeof correctText !== "string" ||
    typeof explain !== "string" ||
    typeof correctStreak !== "number" ||
    typeof isResolved !== "boolean"
  ) {
    return null;
  }
  return {
    isCorrect,
    correctText,
    explain,
    transcript: typeof transcript === "string" ? transcript : null,
    correctStreak,
    isResolved,
  };
}

export function ReviewSession({ cards, streak, hasStudiedToday }: ReviewSessionProps) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [answer, setAnswer] = useState<RawAnswer | undefined>(undefined);
  const [outcome, setOutcome] = useState<MistakeOutcome | null>(null);
  // Once an answer is sent it may have been recorded even if the response was lost, so a retry
  // resends the same answer: the server reports the result it stored for that request.
  const [isAnswerSent, setIsAnswerSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredMistakeCount, setAnsweredMistakeCount] = useState(0);
  const requestIdRef = useRef<string | null>(null);
  // Enter finishes a pending romaji "n" right before answering, so the answer sent is read from
  // here rather than from state that has not re-rendered yet.
  const answerRef = useRef<RawAnswer | undefined>(undefined);
  const sectionRef = useRef<HTMLElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const hasMovedRef = useRef(false);
  const card = cards[index];

  // The buttons a learner presses give way to the next step, so focus follows: to Thẻ tiếp theo
  // once an answer is graded, and to the new card after moving on.
  useEffect(() => {
    if (outcome) {
      nextButtonRef.current?.focus();
    }
  }, [outcome]);
  useEffect(() => {
    if (hasMovedRef.current) {
      sectionRef.current?.focus({ preventScroll: true });
    }
  }, [index]);

  function handleAnswerChange(value: RawAnswer) {
    answerRef.current = value;
    setAnswer(value);
  }

  function handleNext() {
    requestIdRef.current = null;
    hasMovedRef.current = true;
    answerRef.current = undefined;
    setIndex((value) => value + 1);
    setIsFlipped(false);
    setAnswer(undefined);
    setOutcome(null);
    setIsAnswerSent(false);
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
    const current = answerRef.current;
    if (card?.kind !== "mistake" || isSending || isBlankAnswer(current)) {
      return;
    }
    setIsAnswerSent(true);
    const data = await send({
      kind: "mistake",
      assignmentId: card.assignmentId,
      questionId: card.view.id,
      answer: current,
      revision: card.revision,
    });
    const parsed = data ? parseMistakeOutcome(data) : null;
    if (parsed) {
      setOutcome(parsed);
      setAnsweredMistakeCount((value) => value + 1);
      if (parsed.isCorrect) {
        setCorrectCount((value) => value + 1);
      }
    }
  }

  let answerButtonLabel = isAnswerSent ? "Gửi lại câu trả lời" : "Trả lời";
  if (isSending) {
    answerButtonLabel = "Đang chấm…";
  }

  if (!card) {
    // The first study of the day adds today to the streak, which may reach a milestone.
    const extendsStreak = reviewedCount > 0 && !hasStudiedToday;
    const finalStreak = extendsStreak ? streak + 1 : streak;
    const reachedMilestone =
      extendsStreak && STREAK_MILESTONES.some((milestone) => milestone === finalStreak);
    return (
      <div className="form-card review-done" role="status">
        <h2>Xong phiên ôn hôm nay</h2>
        <p>
          Bạn đã ôn {reviewedCount} thẻ
          {correctCount > 0 ? `, trả lời đúng ${correctCount} câu trong sổ lỗi` : ""}.
        </p>
        <div className="stat-tiles review-done-tiles">
          <div className="stat-tile">
            <strong>{reviewedCount}</strong>
            <span>thẻ đã ôn</span>
          </div>
          {answeredMistakeCount > 0 && (
            <div className="stat-tile">
              <strong>
                {correctCount}
                <small>/{answeredMistakeCount}</small>
              </strong>
              <span>câu sổ lỗi trả lời đúng</span>
            </div>
          )}
        </div>
        {reachedMilestone && (
          <p className="milestone-banner">
            <Celebration />
            Mốc mới: {finalStreak} ngày học liên tiếp!
          </p>
        )}
        <StreakCard
          streak={describeStreak(finalStreak, reviewedCount > 0 || hasStudiedToday)}
          headingLevel="h3"
        />
        <div className="button-row">
          <Link href="/classes" className={buttonVariants()}>
            Về lớp của tôi
          </Link>
          <Link href="/progress" className={buttonVariants({ variant: "outline" })}>
            Xem tiến độ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="review-card"
      aria-labelledby="review-card-title"
      tabIndex={-1}
    >
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
      <progress className="review-progress" value={index} max={cards.length} aria-hidden="true" />
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
        // A key per card starts each one fresh: listen count, audio and pieces never carry over.
        <div key={`${card.assignmentId}:${card.view.id}`} className="question-card">
          <QuestionField
            view={card.view}
            position={index + 1}
            total={cards.length}
            value={answer}
            isLocked={outcome !== null || isSending || isAnswerSent}
            onAnswerChange={handleAnswerChange}
            onEnter={() => void handleAnswer()}
            showMeta={false}
          />
          {outcome ? (
            <>
              <AnswerFeedback
                isCorrect={outcome.isCorrect}
                correctText={outcome.correctText}
                explain={outcome.explain}
                transcript={outcome.transcript}
                lang={answerLang(card.view)}
                transcriptLang={card.view.lang}
              />
              <p className="small muted">
                {outcome.isResolved
                  ? "Đã đúng 3 lần liên tiếp: câu này được đánh dấu đã giải quyết."
                  : `Chuỗi đúng: ${outcome.correctStreak}/3.`}
              </p>
              <Button ref={nextButtonRef} onClick={handleNext}>
                Thẻ tiếp theo
              </Button>
            </>
          ) : (
            <Button disabled={isSending || isBlankAnswer(answer)} onClick={handleAnswer}>
              {answerButtonLabel}
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
