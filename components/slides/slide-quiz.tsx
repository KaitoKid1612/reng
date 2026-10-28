"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { PublicLesson } from "@/lib/lesson-schema";

interface SlideQuizProps {
  lesson: PublicLesson;
  questionId: string;
  staticMode?: boolean;
}

export function SlideQuiz({ lesson, questionId, staticMode }: SlideQuizProps) {
  const question = lesson.content.questions.find((item) => item.id === questionId);
  const [result, setResult] = useState<{ answer: string; explain: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleReveal() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/lessons/${lesson.lessonId}/questions/${questionId}?version=${lesson.id}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error("Unable to load practice feedback.");
      }
      const data: unknown = await response.json();
      if (
        !data ||
        typeof data !== "object" ||
        !("answer" in data) ||
        !("explain" in data) ||
        typeof data.answer !== "string" ||
        typeof data.explain !== "string"
      ) {
        throw new Error("Invalid feedback response.");
      }
      setResult({ answer: data.answer, explain: data.explain });
    } catch {
      setError("Chưa tải được đáp án. Bạn thử lại nhé.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!question) {
    return <p>Câu luyện chưa sẵn sàng.</p>;
  }

  return (
    <div className="slide-quiz">
      <h2>Cùng thử một câu</h2>
      <p lang="ja" className="slide-japanese">
        {question.prompt}
      </p>
      {question.options && (
        <ol className="slide-options">
          {question.options.map((option, index) => (
            <li key={index} lang="ja">
              {option}
            </li>
          ))}
        </ol>
      )}
      {!staticMode && (
        <Button onClick={handleReveal} disabled={isLoading || Boolean(result)}>
          {isLoading ? "Đang tải…" : "Hiện đáp án"}
        </Button>
      )}
      {result && (
        <div className="quiz-feedback" role="status">
          <p lang="ja">{result.answer}</p>
          <p>{result.explain}</p>
        </div>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
