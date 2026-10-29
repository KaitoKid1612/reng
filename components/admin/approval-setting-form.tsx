"use client";

import { useActionState } from "react";

import { setTeacherApprovalAction } from "@/app/actions/admin";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface ApprovalSettingFormProps {
  isRequired: boolean;
}

export function ApprovalSettingForm({ isRequired }: ApprovalSettingFormProps) {
  const [state, action, isPending] = useActionState(setTeacherApprovalAction, {});
  return (
    <form action={action} className="form-card">
      <label className="choice-label">
        <input type="checkbox" name="approvalRequired" defaultChecked={isRequired} />
        Duyệt giáo viên mới trước khi cho dạy
      </label>
      <p className="small muted">
        Bật trong giai đoạn thử nghiệm có giới hạn chỗ: giáo viên gửi yêu cầu sau khi xác minh
        email, quản trị viên mở quyền dạy khi đã thống nhất thuê. Tắt để giáo viên tự kích hoạt.
      </p>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        Lưu cài đặt
      </Button>
    </form>
  );
}
