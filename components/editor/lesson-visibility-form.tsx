"use client";

import { useActionState } from "react";

import { setLessonVisibilityAction } from "@/app/actions/lessons";
import { Button } from "@/components/ui/button";

interface LessonVisibilityFormProps {
  lessonId: string;
  visibility: "public" | "class";
}

export function LessonVisibilityForm({ lessonId, visibility }: LessonVisibilityFormProps) {
  const [state, action, isPending] = useActionState(setLessonVisibilityAction, {});
  return (
    <form action={action} className="form-card">
      <input type="hidden" name="lessonId" value={lessonId} />
      <div className="field">
        <label htmlFor="lesson-visibility">Ai có thể đọc bản đã xuất bản?</label>
        <select id="lesson-visibility" name="visibility" defaultValue={visibility}>
          <option value="class">Chỉ tôi và lớp được cấp quyền</option>
          <option value="public">Công khai trên website</option>
        </select>
      </div>
      <label className="choice-label">
        <input type="checkbox" name="acknowledgePublic" />
        Nếu chọn công khai, tôi đồng ý cho mọi người đọc các phiên bản đã xuất bản của bài này.
      </label>
      <p className="small muted">
        Xuất bản giữ nguyên quyền đọc; ghi chú riêng luôn chỉ dành cho chủ bài.
      </p>
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p role="status" className="form-notice">
          {state.notice}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        Lưu quyền đọc
      </Button>
    </form>
  );
}
