"use client";

import { useActionState, useState } from "react";

import { removeStudentAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface RemoveStudentButtonProps {
  classId: string;
  studentId: string;
}

export function RemoveStudentButton({ classId, studentId }: RemoveStudentButtonProps) {
  const [state, action, isPending] = useActionState(removeStudentAction, {});
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming) {
    return (
      <>
        <Button variant="outline" onClick={() => setIsConfirming(true)}>
          Xóa khỏi lớp
        </Button>
        <ActionFeedback state={state} />
      </>
    );
  }
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={studentId} />
      <p className="small">
        Học viên sẽ không mở được bài học và bài tập của lớp, kể cả bài đang làm dở. Điểm và bài đã
        nộp vẫn giữ trong báo cáo. Nếu còn mã lớp, học viên vào lại được; muốn chặn thì đổi mã lớp.
      </p>
      <div className="button-row">
        <Button type="submit" disabled={isPending}>
          Xác nhận xóa
        </Button>
        <Button variant="ghost" onClick={() => setIsConfirming(false)}>
          Giữ trong lớp
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
