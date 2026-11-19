"use client";

import { useEffect, useRef } from "react";

import type { RefObject } from "react";

interface PracticeKeysOptions {
  // Number keys pick an option only while a choice question waits for an answer.
  optionCount: number;
  onPick: (index: number) => void;
  // Enter submits this form when focus is not on a control, so a learner on a computer can
  // answer with 1–4 and Enter without moving focus first.
  formRef: RefObject<HTMLFormElement | null>;
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLInputElement && !["radio", "checkbox"].includes(target.type)))
  );
}

/** Keyboard shortcuts for a practice question on a computer: 1–4 to pick, Enter to go on. */
export function usePracticeKeys({ optionCount, onPick, formRef }: PracticeKeysOptions) {
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) {
        return;
      }
      const number = Number(event.key);
      if (optionCount > 0 && Number.isInteger(number) && number >= 1 && number <= optionCount) {
        event.preventDefault();
        pick.current(number - 1);
        return;
      }
      const onControl =
        event.target instanceof HTMLElement && event.target.closest("button, a, input, select");
      if (event.key === "Enter" && !onControl && formRef.current) {
        event.preventDefault();
        formRef.current.requestSubmit();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [optionCount, formRef]);
}
