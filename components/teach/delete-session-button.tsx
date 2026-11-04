"use client";

import { useActionState, useState } from "react";

import { classSessionAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface DeleteSessionButtonProps {
  classId: string;
  sessionId: string;
}

// A session note cannot be brought back, so deleting it takes a second, deliberate click.
export function DeleteSessionButton({ classId, sessionId }: DeleteSessionButtonProps) {
  const [state, action, isPending] = useActionState(classSessionAction, {});
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming) {
    return (
      <>
        <Button variant="ghost" onClick={() => setIsConfirming(true)}>
          Xóa
        </Button>
        <ActionFeedback state={state} />
      </>
    );
  }
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <p className="small">Xóa ghi chú buổi dạy này? Không khôi phục được.</p>
      <div className="button-row">
        <Button type="submit" name="operation" value="delete" disabled={isPending}>
          Xác nhận xóa
        </Button>
        <Button variant="ghost" onClick={() => setIsConfirming(false)}>
          Giữ lại
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
