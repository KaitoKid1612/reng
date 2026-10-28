"use client";

import { useActionState } from "react";

import { signUp } from "@/app/actions/auth";
import { FormFeedback } from "@/components/auth/form-feedback";
import { ResendConfirmationForm } from "@/components/auth/resend-confirmation-form";
import { Button } from "@/components/ui/button";

interface SignUpFormProps {
  nextPath: string;
}

export function SignUpForm({ nextPath }: SignUpFormProps) {
  const [state, action, isPending] = useActionState(signUp, {});

  if (state.sentTo) {
    return (
      <div className="form-card" role="status">
        <h2>Kiểm tra hộp thư của bạn</h2>
        <p>
          Masu vừa gửi thư xác nhận tới <strong>{state.sentTo}</strong>. Mở thư và bấm liên kết để
          kích hoạt tài khoản, sau đó bạn sẽ quay lại đúng trang đang làm.
        </p>
        <p className="small muted">Không thấy thư? Xem thư mục Spam hoặc gửi lại.</p>
        <ResendConfirmationForm email={state.sentTo} nextPath={nextPath} />
      </div>
    );
  }

  return (
    <form action={action} className="form-card">
      <input type="hidden" name="next" value={nextPath} />
      <div className="field">
        <label htmlFor="full-name">Họ tên</label>
        <input id="full-name" name="fullName" autoComplete="name" required maxLength={80} />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
      </div>
      <div className="field">
        <label htmlFor="password">Mật khẩu</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="small muted">
          Ít nhất 8 ký tự.
        </p>
      </div>
      <FormFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </Button>
    </form>
  );
}
