"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { currentPacingStep, formatExamClock, JLPT_SECTION_SHORT_LABELS } from "@/lib/jlpt";

import type { ExamPacingStep } from "@/lib/jlpt";

interface ExamTimerProps {
  /** When the page hands the attempt in, on the server's clock. */
  handInAt: string;
  /** The server's clock when the page was made, to correct a device clock that is off. */
  serverNow: string;
  /** The real test's time split over the exam's sections; empty when the exam has none. */
  pacing?: readonly ExamPacingStep[];
  /** Moves to a question by its number, from 1. */
  onJump?: (position: number) => void;
  onAutoSubmit: () => void;
}

const URGENT_MS = 5 * 60 * 1000;

// Always shown during a timed mock exam. The server accepts the hand-in for one more minute, so a
// page that was loading or in a background tab still gets the saved and unsaved answers in.
// Under the clock, the section the real test would be in now and its time left: a guide only.
export function ExamTimer({
  handInAt,
  serverNow,
  pacing = [],
  onJump,
  onAutoSubmit,
}: ExamTimerProps) {
  const [offset] = useState(() => Date.parse(serverNow) - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  const hasSubmittedRef = useRef(false);
  const left = Date.parse(handInAt) - now;
  const step = currentPacingStep(pacing, now);
  const stepIndex = step ? pacing.indexOf(step) : -1;

  useEffect(() => {
    const tick = () => setNow(Date.now() + offset);
    const timer = window.setInterval(tick, 1000);
    // Background tabs slow timers down; catch up as soon as the learner comes back.
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [offset]);

  useEffect(() => {
    if (left <= 0 && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      onAutoSubmit();
    }
  }, [left, onAutoSubmit]);

  return (
    <div className="exam-clock">
      <p className="deadline-countdown" role="timer" data-urgent={left <= URGENT_MS || undefined}>
        {left > 0 ? `Thời gian còn lại ${formatExamClock(left)}` : "Hết giờ: Reng đang nộp bài…"}
      </p>
      {step && left > 0 && (
        <p className="exam-pacing">
          <span>
            Giờ đề thật: phần {stepIndex + 1}/{pacing.length},{" "}
            {JLPT_SECTION_SHORT_LABELS[step.section]} (câu {step.firstPosition}–{step.lastPosition}
            ), còn {formatExamClock(Math.min(Date.parse(step.endsAt) - now, left))}
          </span>
          {stepIndex > 0 && onJump && (
            <Button variant="ghost" onClick={() => onJump(step.firstPosition)}>
              Đến câu {step.firstPosition}
            </Button>
          )}
        </p>
      )}
      {/* Changes only when the guide moves on, so a screen reader hears it once per section. */}
      <p className="visually-hidden" aria-live="polite">
        {step && stepIndex > 0
          ? `Theo giờ đề thật, chuyển sang phần ${JLPT_SECTION_SHORT_LABELS[step.section]}, từ câu ${step.firstPosition}.`
          : ""}
      </p>
    </div>
  );
}
