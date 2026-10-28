"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface StartAttemptButtonProps {
  assignmentId: string;
  label: string;
}

const START_ERRORS: Record<string, string> = {
  not_available: "Bài này chưa mở.",
  closed: "Bài này đã đóng.",
  past_due: "Đã quá hạn và bài không cho nộp muộn.",
  no_attempts_left: "Bạn đã dùng hết số lượt làm.",
  not_found: "Không tìm thấy bài này trong lớp của bạn.",
};

export function StartAttemptButton({ assignmentId, label }: StartAttemptButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    setIsStarting(true);
    setError("");
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/attempts`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
        return;
      }
      const data: unknown = await response.json().catch(() => null);
      const code =
        data && typeof data === "object" && "code" in data && typeof data.code === "string"
          ? data.code
          : "";
      setError(START_ERRORS[code] ?? "Chưa bắt đầu được. Bạn thử lại nhé.");
    } catch {
      setError("Mất kết nối. Kiểm tra mạng rồi thử lại.");
    }
    setIsStarting(false);
  }

  return (
    <div>
      <Button onClick={handleStart} disabled={isStarting}>
        {isStarting ? "Đang mở…" : label}
      </Button>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
