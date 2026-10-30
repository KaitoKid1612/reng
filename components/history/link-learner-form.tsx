"use client";

import { useActionState } from "react";

import { linkHistoryAccount } from "@/app/actions/learning-history";
import { Button } from "@/components/ui/button";

interface LinkLearnerFormProps {
  archiveId: string;
}

export function LinkLearnerForm({ archiveId }: LinkLearnerFormProps) {
  const [state, action, isPending] = useActionState(linkHistoryAccount, {});
  return (
    <form action={action} className="form-card">
      <input type="hidden" name="archiveId" value={archiveId} />
      <p>
        Học viên chưa có tài khoản được liên kết. Sau khi học viên đăng ký đúng email và bạn xác
        nhận đúng người, bấm nút bên dưới. Học viên không tự nhận lịch sử chỉ bằng cách đăng ký.
      </p>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Đang liên kết…" : "Xác nhận và liên kết học viên"}
      </Button>
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      {state.notice && <p role="status">{state.notice}</p>}
    </form>
  );
}
