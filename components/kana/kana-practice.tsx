"use client";

import { useReducer, useRef, useState } from "react";

import { useAudio } from "@/components/audio-provider";
import { PracticeQuestion } from "@/components/kana/practice-question";
import { PracticeResult } from "@/components/kana/practice-result";
import { PracticeSetup } from "@/components/kana/practice-setup";
import {
  createSession,
  getPracticeMistakes,
  initialPractice,
  normalizeRomaji,
  practiceReducer,
} from "@/lib/kana";

import type { PracticeConfiguration } from "@/components/kana/practice-setup";
import type { FormEvent } from "react";
import type { KanaItem, KanaScript } from "@/lib/kana";

interface KanaPracticeProps {
  items: KanaItem[];
  initialScript: KanaScript;
}

export function KanaPractice({ items, initialScript }: KanaPracticeProps) {
  const [configuration, setConfiguration] = useState<PracticeConfiguration>({
    script: initialScript,
    groups: ["basic"],
    questionCount: "10",
  });
  const [state, dispatch] = useReducer(practiceReducer, initialPractice);
  const [answer, setAnswer] = useState("");
  const [inputError, setInputError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const audio = useAudio();
  const availableItems = items.filter(
    (item) => item.script === configuration.script && configuration.groups.includes(item.group),
  );

  function startSession(sessionItems: KanaItem[], questionCount: number) {
    audio.reset();
    setAnswer("");
    setInputError("");
    dispatch({ type: "start", items: createSession(sessionItems, questionCount) });
  }

  function handleStart() {
    const questionCount =
      configuration.questionCount === "all"
        ? availableItems.length
        : Number(configuration.questionCount);

    startSession(availableItems, questionCount);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (state.phase === "feedback") {
      audio.reset();
      setAnswer("");
      setInputError("");
      dispatch({ type: "next" });
      return;
    }

    if (!normalizeRomaji(answer)) {
      setInputError("Bạn nhập cách đọc bằng romaji trước nhé.");
      inputRef.current?.focus();
      return;
    }

    setInputError("");
    dispatch({ type: "submit", raw: answer });
  }

  function handleReset() {
    audio.reset();
    dispatch({ type: "reset" });
  }

  if (state.phase === "idle") {
    return (
      <PracticeSetup
        configuration={configuration}
        availableCount={availableItems.length}
        onConfigurationChange={setConfiguration}
        onStart={handleStart}
      />
    );
  }

  if (state.phase === "result") {
    const mistakes = getPracticeMistakes(state);

    function handleRetryMistakes() {
      startSession(
        mistakes.map((mistake) => mistake.item),
        mistakes.length,
      );
    }

    return (
      <PracticeResult
        mistakes={mistakes}
        totalCount={state.records.length}
        onRetryMistakes={handleRetryMistakes}
        onReset={handleReset}
      />
    );
  }

  const currentItem = state.items[state.index];

  if (!currentItem) {
    throw new Error("The active practice question is missing from the session.");
  }

  return (
    <PracticeQuestion
      script={configuration.script}
      item={currentItem}
      questionIndex={state.index}
      totalCount={state.items.length}
      feedback={state.phase === "feedback" ? state.records[state.index] : undefined}
      answer={answer}
      inputError={inputError}
      inputRef={inputRef}
      onAnswerChange={setAnswer}
      onSubmit={handleSubmit}
    />
  );
}
