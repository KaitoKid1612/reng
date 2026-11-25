"use client";

import { useEffect, useRef, useState } from "react";

import { describeTimeLeft } from "@/lib/assignment";

interface DeadlineCountdownProps {
  dueAt: string | null;
  allowLate: boolean;
  serverNow: string;
  /** Called once when an attempt that cannot be late should submit itself. */
  onAutoSubmit: () => void;
}

export function DeadlineCountdown({
  dueAt,
  allowLate,
  serverNow,
  onAutoSubmit,
}: DeadlineCountdownProps) {
  // Counted on the server's clock, like ExamTimer: a device clock ahead by a few minutes would
  // otherwise hand a no-late attempt in before its deadline.
  const [offset] = useState(() => Date.parse(serverNow) - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  const hasSubmittedRef = useRef(false);
  const timeLeft = describeTimeLeft(dueAt, allowLate, now);

  useEffect(() => {
    if (!dueAt) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(timer);
  }, [dueAt, offset]);

  useEffect(() => {
    if (timeLeft?.shouldAutoSubmit && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      onAutoSubmit();
    }
  }, [timeLeft?.shouldAutoSubmit, onAutoSubmit]);

  if (!timeLeft) {
    return null;
  }
  // role="timer" is not announced on every tick; the colour change marks the last ten minutes.
  return (
    <p className="deadline-countdown" role="timer" data-urgent={timeLeft.isUrgent || undefined}>
      {timeLeft.text}
    </p>
  );
}
