"use client";

import { useActionState, useState } from "react";

import { closeAssignmentAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface CloseAssignmentButtonProps {
  assignmentId: string;
  openAttemptCount: number;
}

export function CloseAssignmentButton({
  assignmentId,
  openAttemptCount,
}: CloseAssignmentButtonProps) {
  const [state, action, isPending] = useActionState(closeAssignmentAction, {});
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming) {
    return (
      <>
        <Button variant="ghost" onClick={() => setIsConfirming(true)}>
          Đóng bài
        </Button>
        <ActionFeedback state={state} />
      </>
    );
  }
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <p className="small">
        {openAttemptCount > 0
          ? `${openAttemptCount} học viên đang làm dở sẽ không nộp được nữa.`
          : "Học viên sẽ không bắt đầu hoặc nộp thêm."}{" "}
        Không mở lại được.
      </p>
      <div className="button-row">
        <Button type="submit" disabled={isPending}>
          Xác nhận đóng
        </Button>
        <Button variant="ghost" onClick={() => setIsConfirming(false)}>
          Giữ bài mở
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
