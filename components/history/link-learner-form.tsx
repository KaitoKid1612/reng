"use client";

import { useActionState } from "react";

import { linkHistoryAccount } from "@/app/actions/learning-history";
import { Button } from "@/components/ui/button";
import { formatStudyDateTime } from "@/lib/study-days";

interface LinkLearnerFormProps {
  archiveId: string;
}

export function LinkLearnerForm({ archiveId }: LinkLearnerFormProps) {
  const [state, action, isPending] = useActionState(linkHistoryAccount, {});
  const { candidate } = state;
  return (
    <form action={action} className="form-card">
      <input type="hidden" name="archiveId" value={archiveId} />
      <p>
        Học viên chưa có tài khoản được liên kết. Sau khi học viên đăng ký đúng email, kiểm tra tài
        khoản rồi xác nhận với học viên trước khi liên kết. Học viên không tự nhận lịch sử chỉ bằng
        cách đăng ký.
      </p>
      {candidate ? (
        <>
          <input type="hidden" name="candidateId" value={candidate.id} />
          <ul>
            <li>Tên hiển thị: {candidate.fullName || "chưa đặt tên"}</li>
            <li>Đăng ký lúc {formatStudyDateTime(candidate.createdAt)}</li>
            <li>
              Đăng nhập gần nhất:{" "}
              {candidate.lastSignInAt ? formatStudyDateTime(candidate.lastSignInAt) : "chưa có"}
            </li>
          </ul>
          <p className="small muted">
            Reng chưa bắt xác nhận email khi đăng ký, nên người biết email cũng có thể đăng ký
            trước. Hỏi học viên tên và giờ đăng ký có khớp không rồi mới liên kết.
          </p>
          <label className="choice-label">
            <input type="checkbox" name="confirmed" required />
            Tôi đã hỏi học viên và đây đúng là tài khoản của họ
          </label>
          <Button type="submit" name="operation" value="link" disabled={isPending}>
            {isPending ? "Đang liên kết…" : "Liên kết với tài khoản này"}
          </Button>
        </>
      ) : (
        <Button type="submit" name="operation" value="check" disabled={isPending}>
          {isPending ? "Đang kiểm tra…" : "Kiểm tra tài khoản học viên"}
        </Button>
      )}
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      {state.notice && <p role="status">{state.notice}</p>}
    </form>
  );
}
