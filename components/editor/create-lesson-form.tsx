"use client";

import { useActionState } from "react";

import { createLessonAction } from "@/app/actions/lessons";
import { Button } from "@/components/ui/button";

interface CreateLessonFormProps {
  suggestedId: string;
  suggestedOrder: number;
}

export function CreateLessonForm({ suggestedId, suggestedOrder }: CreateLessonFormProps) {
  const [state, action, isPending] = useActionState(createLessonAction, {});
  return (
    <form action={action} className="form-card">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="lesson-id">Mã bài</label>
          <input
            id="lesson-id"
            name="id"
            required
            minLength={3}
            maxLength={64}
            pattern="[a-z0-9][a-z0-9\-]*"
            defaultValue={suggestedId}
            aria-describedby="lesson-id-hint"
          />
          <p id="lesson-id-hint" className="small muted">
            Chữ thường, số, gạch nối; dùng trong đường dẫn và không đổi được sau khi tạo.
          </p>
        </div>
        <div className="field">
          <label htmlFor="lesson-order">Thứ tự trong khóa</label>
          <input
            id="lesson-order"
            name="order"
            type="number"
            min={1}
            max={999}
            required
            defaultValue={suggestedOrder}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="lesson-title">Tiêu đề tiếng Việt</label>
        <input id="lesson-title" name="title" required maxLength={160} placeholder="Mua sắm" />
      </div>
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        Tạo và mở editor
      </Button>
    </form>
  );
}
