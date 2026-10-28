"use client";

import { useActionState } from "react";

import { joinCodeAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";
import { formatJoinCode } from "@/lib/join-code";

interface JoinCodeControlsProps {
  classId: string;
  joinCode: string;
  isEnabled: boolean;
}

export function JoinCodeControls({ classId, joinCode, isEnabled }: JoinCodeControlsProps) {
  const [state, action, isPending] = useActionState(joinCodeAction, {});
  return (
    <div className="form-card">
      <h2>Mã lớp</h2>
      <p className="join-code" aria-label={`Mã lớp ${joinCode.split("").join(" ")}`}>
        {formatJoinCode(joinCode)}
      </p>
      <p className="small muted">
        {isEnabled
          ? "Học viên mở /join-class và nhập mã này để vào lớp."
          : "Đang ngừng nhận học viên mới; mã hiện tại không dùng được."}
      </p>
      <form action={action} className="button-row">
        <input type="hidden" name="classId" value={classId} />
        <Button
          type="submit"
          name="operation"
          value="rotate"
          variant="outline"
          disabled={isPending}
        >
          Đổi mã mới
        </Button>
        <Button
          type="submit"
          name="operation"
          value={isEnabled ? "disable" : "enable"}
          variant="ghost"
          disabled={isPending}
        >
          {isEnabled ? "Ngừng nhận học viên" : "Mở lại nhận học viên"}
        </Button>
      </form>
      <ActionFeedback state={state} />
    </div>
  );
}
