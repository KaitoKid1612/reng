"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { currentPacingStep, formatExamClock, JLPT_SECTION_SHORT_LABELS } from "@/lib/jlpt";

import type { ExamPacingStep } from "@/lib/jlpt";

interface StudyClockProps {
  /** When the attempt started, on the server's clock. */
  startedAt: string;
  /** The server's clock when the page was made, to correct a device clock that is off. */
  serverNow: string;
  /** The real test's minutes for this set's sections, from planStudyPacing. */
  pacing: readonly ExamPacingStep[];
  /** Moves to a question by its number, from 1. */
  onJump?: (position: number) => void;
}

const HIDDEN_KEY = "reng-study-clock-hidden";

function readHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

// Practice in test order (a JLPT-format daily set) counts up against the real test's time for
// the same questions. It never hands the set in: it shows the pace, and a learner who finds it
// stressful can hide it (the browser remembers).
export function StudyClock({ startedAt, serverNow, pacing, onJump }: StudyClockProps) {
  const [offset] = useState(() => Date.parse(serverNow) - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  const [isHidden, setIsHidden] = useState(readHidden);
  const elapsed = Math.max(0, now - Date.parse(startedAt));
  const totalMinutes = pacing.reduce((sum, step) => sum + step.minutes, 0);
  const over = elapsed - totalMinutes * 60 * 1000;
  const step = currentPacingStep(pacing, now);
  const stepIndex = step ? pacing.indexOf(step) : -1;

  useEffect(() => {
    if (isHidden) {
      return;
    }
    const tick = () => setNow(Date.now() + offset);
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [offset, isHidden]);

  const toggle = () => {
    const next = !isHidden;
    setIsHidden(next);
    setNow(Date.now() + offset);
    try {
      localStorage.setItem(HIDDEN_KEY, next ? "1" : "0");
    } catch {
      // Without storage the choice lasts for this page only.
    }
  };

  return (
    <div className="exam-clock study-clock">
      <p className="exam-pacing">
        {!isHidden && (
          <span className="deadline-countdown" role="timer" data-urgent={over > 0 || undefined}>
            Đã làm {formatExamClock(elapsed)} · đề thật khoảng {totalMinutes} phút
          </span>
        )}
        <Button variant="ghost" onClick={toggle} aria-pressed={!isHidden}>
          {isHidden ? "Hiện đồng hồ" : "Ẩn đồng hồ"}
        </Button>
      </p>
      {!isHidden && step && (
        <p className="exam-pacing">
          <span>
            {over > 0
              ? `Đã quá giờ đề thật ${formatExamClock(over)}`
              : `Theo giờ đề thật: phần ${stepIndex + 1}/${pacing.length}, ${
                  JLPT_SECTION_SHORT_LABELS[step.section]
                } (câu ${step.firstPosition}–${step.lastPosition}), còn ${formatExamClock(
                  Date.parse(step.endsAt) - now,
                )}`}
          </span>
          {over <= 0 && stepIndex > 0 && onJump && (
            <Button variant="ghost" onClick={() => onJump(step.firstPosition)}>
              Đến câu {step.firstPosition}
            </Button>
          )}
        </p>
      )}
    </div>
  );
}
