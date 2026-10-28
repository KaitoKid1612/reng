"use client";

import { useActionState } from "react";

import { resetPassword } from "@/app/actions/auth";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState(resetPassword, {});
  return (
    <form action={action} className="form-card">
      <div className="field">
        <label htmlFor="password">Mật khẩu mới</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
        />
      </div>
      <div className="field">
        <label htmlFor="confirm-password">Nhập lại mật khẩu mới</label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
        />
      </div>
      <FormFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Đang lưu…" : "Đặt mật khẩu mới"}
      </Button>
    </form>
  );
}
