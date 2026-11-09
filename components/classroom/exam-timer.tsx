"use client";

import { useEffect, useRef, useState } from "react";

import { formatExamClock } from "@/lib/jlpt";

interface ExamTimerProps {
  /** When the page hands the attempt in, on the server's clock. */
  handInAt: string;
  /** The server's clock when the page was made, to correct a device clock that is off. */
  serverNow: string;
  onAutoSubmit: () => void;
}

const URGENT_MS = 5 * 60 * 1000;

// Always shown during a timed mock exam. The server accepts the hand-in for one more minute, so a
// page that was loading or in a background tab still gets the saved and unsaved answers in.
export function ExamTimer({ handInAt, serverNow, onAutoSubmit }: ExamTimerProps) {
  const [offset] = useState(() => Date.parse(serverNow) - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  const hasSubmittedRef = useRef(false);
  const left = Date.parse(handInAt) - now;

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
    <p className="deadline-countdown" role="timer" data-urgent={left <= URGENT_MS || undefined}>
      {left > 0 ? `Thời gian còn lại ${formatExamClock(left)}` : "Hết giờ: Reng đang nộp bài…"}
    </p>
  );
}
