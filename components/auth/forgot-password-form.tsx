"use client";

import { useActionState } from "react";

import { requestPasswordReset } from "@/app/actions/auth";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(requestPasswordReset, {});
  return (
    <form action={action} className="form-card">
      <div className="field">
        <label htmlFor="email">Email đã đăng ký</label>
        <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
      </div>
      <FormFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Đang gửi…" : "Gửi link đặt lại"}
      </Button>
    </form>
  );
}
