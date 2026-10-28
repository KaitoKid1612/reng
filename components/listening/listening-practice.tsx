"use client";

import { useState } from "react";
import { z } from "zod";

import { AnswerFeedback } from "@/components/classroom/answer-feedback";
import { QuestionField } from "@/components/classroom/question-field";
import { Button } from "@/components/ui/button";
import { MAX_RECORDED_LISTENS } from "@/lib/assignment";
import { isBlankAnswer } from "@/lib/grading/raw-answer";

import type { QuestionView } from "@/lib/assignment";
import type { RawAnswer } from "@/lib/grading/raw-answer";

interface ListeningPracticeProps {
  lessonId: string;
  versionId: string;
  views: QuestionView[];
}

const checkResultSchema = z.object({
  isCorrect: z.boolean(),
  correctText: z.string(),
  explain: z.string(),
  transcript: z.string().nullable(),
});

type CheckResult = z.infer<typeof checkResultSchema>;

interface QuestionState {
  answer?: RawAnswer;
  listens: number;
  result?: CheckResult;
  isPending: boolean;
  error: string;
}

const INITIAL_STATE: QuestionState = { listens: 0, isPending: false, error: "" };

// Public practice keeps progress in this page only; answers are graded by the check API.
export function ListeningPractice({ lessonId, versionId, views }: ListeningPracticeProps) {
  const [states, setStates] = useState<Record<string, QuestionState>>({});

  function update(questionId: string, change: (current: QuestionState) => QuestionState) {
    setStates((current) => ({
      ...current,
      [questionId]: change(current[questionId] ?? INITIAL_STATE),
    }));
  }

  async function handleCheck(questionId: string, answer: RawAnswer) {
    update(questionId, (current) => ({ ...current, isPending: true, error: "" }));
    try {
      const response = await fetch(
        `/api/lessons/${encodeURIComponent(lessonId)}/questions/${encodeURIComponent(questionId)}/check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer, version: versionId }),
        },
      );
      if (!response.ok) {
        throw new Error(`Check failed with ${response.status}.`);
      }
      const result = checkResultSchema.parse(await response.json());
      update(questionId, (current) => ({ ...current, result, isPending: false }));
    } catch {
      update(questionId, (current) => ({
        ...current,
        isPending: false,
        error: "Chưa kiểm tra được. Kiểm tra mạng rồi bấm lại.",
      }));
    }
  }

  return (
    <ol className="attempt-questions" aria-label="Câu luyện nghe">
      {views.map((view, index) => {
        const state = states[view.id] ?? INITIAL_STATE;
        return (
          <li key={view.id} className="question-card">
            <QuestionField
              view={view}
              position={index + 1}
              total={views.length}
              value={state.answer}
              isLocked={Boolean(state.result) || state.isPending}
              onAnswerChange={(answer) => update(view.id, (current) => ({ ...current, answer }))}
              listenCount={state.listens}
              onListen={() =>
                update(view.id, (current) => ({
                  ...current,
                  listens: Math.min(MAX_RECORDED_LISTENS, current.listens + 1),
                }))
              }
            />
            {state.result ? (
              <>
                <AnswerFeedback {...state.result} />
                <Button
                  variant="ghost"
                  onClick={() =>
                    update(view.id, (current) => ({
                      ...current,
                      answer: undefined,
                      result: undefined,
                    }))
                  }
                >
                  Làm lại câu này
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                disabled={state.isPending || isBlankAnswer(state.answer)}
                onClick={() => state.answer !== undefined && handleCheck(view.id, state.answer)}
              >
                {state.isPending ? "Đang kiểm tra…" : "Kiểm tra câu này"}
              </Button>
            )}
            {state.error && (
              <p role="alert" className="error-text">
                {state.error}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
