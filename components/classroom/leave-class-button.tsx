"use client";

import { useActionState, useState } from "react";

import { leaveClassAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface LeaveClassButtonProps {
  classId: string;
}

export function LeaveClassButton({ classId }: LeaveClassButtonProps) {
  const [state, action, isPending] = useActionState(leaveClassAction, {});
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming) {
    return (
      <>
        <Button variant="ghost" onClick={() => setIsConfirming(true)}>
          Rời lớp
        </Button>
        <ActionFeedback state={state} />
      </>
    );
  }
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="classId" value={classId} />
      <p className="small">
        Bạn sẽ không mở được bài học và bài tập của lớp này nữa, kể cả bài đang làm dở. Kết quả đã
        nộp vẫn được giữ. Muốn học lại, nhập mã lớp giáo viên gửi.
      </p>
      <div className="button-row">
        <Button type="submit" disabled={isPending}>
          Xác nhận rời lớp
        </Button>
        <Button variant="ghost" onClick={() => setIsConfirming(false)}>
          Ở lại lớp
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
