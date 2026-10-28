"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn } from "@/app/actions/auth";
import { FormFeedback } from "@/components/auth/form-feedback";
import { ResendConfirmationForm } from "@/components/auth/resend-confirmation-form";
import { Button } from "@/components/ui/button";

interface SignInFormProps {
  nextPath: string;
}

export function SignInForm({ nextPath }: SignInFormProps) {
  const [state, action, isPending] = useActionState(signIn, {});
  return (
    <div className="form-card">
      <form action={action}>
        <input type="hidden" name="next" value={nextPath} />
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={72}
          />
        </div>
        <FormFeedback state={state} />
        <div className="button-row">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Đang đăng nhập…" : "Đăng nhập"}
          </Button>
          <Link href="/forgot-password" className="form-link">
            Quên mật khẩu?
          </Link>
        </div>
      </form>
      {state.unconfirmedEmail && (
        <ResendConfirmationForm email={state.unconfirmedEmail} nextPath={nextPath} />
      )}
    </div>
  );
}
