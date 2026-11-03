import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentAccount } from "@/lib/server/account";
import { canSetNewPassword } from "@/lib/server/password-reset";
import { createSessionClient } from "@/lib/supabase-session";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Đặt mật khẩu mới" };

// Only a session opened from the email link may set a new password; signing in with the
// password on a shared device is not enough.
export default async function ResetPasswordPage() {
  const account = await getCurrentAccount();
  const client = account ? await createSessionClient() : null;
  const canReset = client ? await canSetNewPassword(client) : false;
  return (
    <div className="narrow-page">
      <h1>Đặt mật khẩu mới</h1>
      {account && canReset ? (
        <>
          <p className="muted">Tài khoản: {account.email}</p>
          <ResetPasswordForm />
        </>
      ) : (
        <p className="sample-notice">
          {account
            ? "Trang này chỉ dùng được trong 1 giờ sau khi mở link đặt lại mật khẩu trong email."
            : "Liên kết đặt lại đã hết hạn hoặc chưa mở từ email."}{" "}
          <Link href="/forgot-password">Gửi yêu cầu mới</Link>.
        </p>
      )}
    </div>
  );
}
