"use client";

import { useActionState, useState } from "react";

import { joinCodeAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";
import { formatJoinCode } from "@/lib/join-code";

interface JoinCodeControlsProps {
  classId: string;
  joinCode: string;
  isEnabled: boolean;
  inviteUrl: string;
}

export function JoinCodeControls({
  classId,
  joinCode,
  isEnabled,
  inviteUrl,
}: JoinCodeControlsProps) {
  const [state, action, isPending] = useActionState(joinCodeAction, {});
  const [copyNotice, setCopyNotice] = useState("");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyNotice("Đã sao chép link mời. Dán vào Zalo/Messenger để gửi cho học viên.");
    } catch {
      // Clipboard access can be blocked; the link stays visible to copy by hand.
      setCopyNotice("Trình duyệt chưa cho sao chép tự động. Chọn link bên dưới rồi sao chép.");
    }
  }

  return (
    <div className="form-card" id="join-code">
      <h2>Mã lớp</h2>
      <p className="join-code" aria-label={`Mã lớp ${joinCode.split("").join(" ")}`}>
        {formatJoinCode(joinCode)}
      </p>
      {isEnabled ? (
        <>
          <p className="small muted">
            Gửi link mời bên dưới: học viên mở link, tạo tài khoản hoặc đăng nhập rồi bấm Vào lớp,
            không phải gõ mã. Học viên cũng có thể mở trang Vào lớp và nhập mã này.
          </p>
          <p className="small">
            <a href={inviteUrl}>{inviteUrl}</a>
          </p>
          <div className="button-row">
            <Button type="button" onClick={handleCopy}>
              Sao chép link mời
            </Button>
          </div>
          {copyNotice && (
            <p className="small muted" role="status">
              {copyNotice}
            </p>
          )}
        </>
      ) : (
        <p className="small muted">Đang ngừng nhận học viên mới; mã hiện tại không dùng được.</p>
      )}
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
