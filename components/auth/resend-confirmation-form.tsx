"use client";

import { useActionState } from "react";

import { resendConfirmation } from "@/app/actions/auth";
import { FormFeedback } from "@/components/auth/form-feedback";
import { Button } from "@/components/ui/button";

interface ResendConfirmationFormProps {
  email?: string;
  nextPath: string;
}

export function ResendConfirmationForm({ email, nextPath }: ResendConfirmationFormProps) {
  const [state, action, isPending] = useActionState(resendConfirmation, {});
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="next" value={nextPath} />
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <div className="field">
          <label htmlFor="resend-email">Email đã đăng ký</label>
          <input
            id="resend-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </div>
      )}
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Đang gửi…" : "Gửi lại thư xác nhận"}
      </Button>
      <FormFeedback state={state} />
    </form>
  );
}
