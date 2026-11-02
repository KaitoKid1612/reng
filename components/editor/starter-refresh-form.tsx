"use client";

import { useActionState } from "react";

import { refreshFromStarterAction } from "@/app/actions/lessons";
import { Button } from "@/components/ui/button";

interface StarterRefreshFormProps {
  lessonId: string;
  revision: number;
}

export function StarterRefreshForm({ lessonId, revision }: StarterRefreshFormProps) {
  const [state, action, isPending] = useActionState(refreshFromStarterAction, {});
  return (
    <form action={action} className="form-card">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="revision" value={revision} />
      <label className="choice-label">
        <input type="checkbox" name="confirmed" required />
        Tôi hiểu bản nháp hiện tại sẽ được thay bằng nội dung mẫu mới nhất
      </label>
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        Thay bản nháp bằng mẫu mới nhất
      </Button>
    </form>
  );
}
