"use client";

import { useActionState, useState } from "react";

import { archiveLessonAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface ArchiveLessonButtonProps {
  lessonId: string;
  title: string;
  /** Restoring needs no confirmation; archiving hides the lesson from the list. */
  isArchived?: boolean;
}

export function ArchiveLessonButton({
  lessonId,
  title,
  isArchived = false,
}: ArchiveLessonButtonProps) {
  const [state, action, isPending] = useActionState(archiveLessonAction, {});
  const [isConfirming, setIsConfirming] = useState(false);
  if (isArchived) {
    return (
      <form action={action}>
        <input type="hidden" name="lessonId" value={lessonId} />
        <Button
          type="submit"
          name="operation"
          value="restore"
          variant="outline"
          disabled={isPending}
        >
          Đưa trở lại
        </Button>
        <ActionFeedback state={state} />
      </form>
    );
  }
  if (!isConfirming) {
    return (
      <>
        <Button variant="ghost" onClick={() => setIsConfirming(true)}>
          Lưu trữ
        </Button>
        <ActionFeedback state={state} />
      </>
    );
  }
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="lessonId" value={lessonId} />
      <p className="small">
        Lưu trữ «{title}»? Bài rời danh sách và không tính vào hạn mức; đưa trở lại được ở mục Bài
        đã lưu trữ.
      </p>
      <div className="button-row">
        <Button type="submit" name="operation" value="archive" disabled={isPending}>
          Xác nhận lưu trữ
        </Button>
        <Button variant="ghost" onClick={() => setIsConfirming(false)}>
          Giữ lại
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
