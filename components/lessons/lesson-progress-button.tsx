"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatStudyDateTime } from "@/lib/study-days";

interface LessonProgressButtonProps {
  lessonId: string;
  versionId: string;
  completedAt: string | null;
}

// Completion is recorded only when the learner confirms it, never when the page opens.
export function LessonProgressButton({
  lessonId,
  versionId,
  completedAt,
}: LessonProgressButtonProps) {
  const [completed, setCompleted] = useState(completedAt);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleComplete() {
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!response.ok) {
        throw new Error("Progress was not saved.");
      }
      setCompleted(new Date().toISOString());
    } catch {
      setError("Chưa lưu được. Bạn thử lại nhé.");
    }
    setIsSaving(false);
  }

  return (
    <div className="lesson-progress">
      {completed ? (
        <p role="status" className="form-notice">
          Đã đọc xong lúc {formatStudyDateTime(completed)}.
        </p>
      ) : (
        <Button variant="outline" onClick={handleComplete} disabled={isSaving}>
          {isSaving ? "Đang lưu…" : "Đánh dấu đã đọc xong"}
        </Button>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </div>
  );
}
