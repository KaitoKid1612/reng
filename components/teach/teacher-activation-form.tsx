"use client";

import { useActionState } from "react";

import { activateTeacherAction } from "@/app/actions/teacher-account";
import { Button } from "@/components/ui/button";

export function TeacherActivationForm() {
  const [state, action, isPending] = useActionState(activateTeacherAction, {});
  return (
    <form action={action} className="form-card">
      <label className="choice-label">
        <input name="acceptTerms" type="checkbox" required />
        Tôi chịu trách nhiệm kiểm tra chuyên môn và đáp án, có quyền sử dụng tài liệu tải lên và chỉ
        chia sẻ trong phạm vi được phép.
      </label>
      <p className="small muted">
        Kích hoạt bằng email đã xác minh. Bạn vẫn có thể tham gia lớp và học bằng tài khoản này.
        Việc kích hoạt không phải chứng nhận chuyên môn giáo viên. Phiên bản xác nhận: 29/10/2026.
      </p>
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        Kích hoạt giảng dạy
      </Button>
    </form>
  );
}
