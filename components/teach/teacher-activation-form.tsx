"use client";

import { useActionState } from "react";

import { activateTeacherAction } from "@/app/actions/teacher-account";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface TeacherActivationFormProps {
  requiresApproval: boolean;
}

export function TeacherActivationForm({ requiresApproval }: TeacherActivationFormProps) {
  const [state, action, isPending] = useActionState(activateTeacherAction, {});
  if (state.notice) {
    return <ActionFeedback state={state} />;
  }
  return (
    <form action={action} className="form-card">
      <label className="choice-label">
        <input name="acceptTerms" type="checkbox" required />
        Tôi chịu trách nhiệm kiểm tra chuyên môn và đáp án, có quyền sử dụng tài liệu tải lên và chỉ
        chia sẻ trong phạm vi được phép.
      </label>
      <p className="small muted">
        {requiresApproval
          ? "Trong giai đoạn thử nghiệm, quản trị viên duyệt từng tài khoản giáo viên trước khi mở quyền dạy."
          : "Kích hoạt bằng email đã xác minh."}{" "}
        Bạn vẫn có thể tham gia lớp và học bằng tài khoản này. Việc kích hoạt không phải chứng nhận
        chuyên môn giáo viên. Phiên bản xác nhận: 29/10/2026.
      </p>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        {requiresApproval ? "Gửi yêu cầu giảng dạy" : "Kích hoạt giảng dạy"}
      </Button>
    </form>
  );
}
