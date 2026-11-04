"use client";

import { useActionState, useState } from "react";

import { removeClassLessonAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface RemoveClassLessonButtonProps {
  classId: string;
  lessonId: string;
  title: string;
}

// For a lesson put into the wrong class. The lesson itself stays in the teacher's list.
export function RemoveClassLessonButton({
  classId,
  lessonId,
  title,
}: RemoveClassLessonButtonProps) {
  const [state, action, isPending] = useActionState(removeClassLessonAction, {});
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming) {
    return (
      <>
        <Button variant="ghost" onClick={() => setIsConfirming(true)}>
          Gỡ khỏi lớp
        </Button>
        <ActionFeedback state={state} />
      </>
    );
  }
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <p className="small">
        Gỡ «{title}» khỏi lớp? Học viên không còn thấy bài; bài vẫn còn trong danh sách bài của bạn
        và đưa lại vào lớp được.
      </p>
      <div className="button-row">
        <Button type="submit" disabled={isPending}>
          Xác nhận gỡ
        </Button>
        <Button variant="ghost" onClick={() => setIsConfirming(false)}>
          Giữ trong lớp
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
