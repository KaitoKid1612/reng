"use client";

import { useEffect, useRef, useState } from "react";

import { FuriganaText } from "@/components/lessons/japanese-text";
import { OPTION_LETTERS } from "@/lib/live-quiz";

// Seconds left on the open question, counted on this device's clock corrected by the server's,
// so every phone and the shared screen reach zero together.
export function useSecondsLeft(
  startedAt: string | null,
  seconds: number,
  serverNow: string | null,
): number | null {
  const [now, setNow] = useState(() => Date.now());
  const offset = useRef(0);
  useEffect(() => {
    if (serverNow) {
      offset.current = Date.parse(serverNow) - Date.now();
    }
  }, [serverNow]);
  useEffect(() => {
    if (!startedAt) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [startedAt]);
  if (!startedAt) {
    return null;
  }
  // eslint-disable-next-line react-hooks/refs -- the correction only moves the next tick.
  const left = Date.parse(startedAt) + seconds * 1000 - (now + offset.current);
  return Math.min(seconds, Math.max(0, Math.ceil(left / 1000)));
}

export function LiveCountdown({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  return (
    <div className="live-countdown" data-urgent={secondsLeft <= 5}>
      <span aria-hidden="true" className="live-countdown-bar">
        <span style={{ width: `${(secondsLeft / total) * 100}%` }} />
      </span>
      <span role="timer" aria-label={`Còn ${secondsLeft} giây`}>
        {secondsLeft}
      </span>
    </div>
  );
}

export function LiveQuestionText({
  instruction,
  prompt,
}: {
  instruction: string | null;
  prompt: string;
}) {
  return (
    <>
      {instruction && (
        <p className="live-instruction">
          <FuriganaText text={instruction} />
        </p>
      )}
      <p className="live-prompt">
        <FuriganaText text={prompt} />
      </p>
    </>
  );
}

// The letter and its colour tell options apart; a tag says in words which one is right.
export function OptionLabel({ index, text, tag }: { index: number; text: string; tag?: string }) {
  return (
    <>
      <span className="live-option-letter" aria-hidden="true">
        {OPTION_LETTERS[index]}
      </span>
      <span className="live-option-text">
        <FuriganaText text={text} />
      </span>
      {tag && (
        <span className="live-option-tag" lang="vi">
          {tag}
        </span>
      )}
    </>
  );
}
