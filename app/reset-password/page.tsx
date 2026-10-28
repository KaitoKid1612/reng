import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentAccount } from "@/lib/server/account";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Đặt mật khẩu mới" };

export default async function ResetPasswordPage() {
  const account = await getCurrentAccount();
  return (
    <div className="narrow-page">
      <h1>Đặt mật khẩu mới</h1>
      {account ? (
        <>
          <p className="muted">Tài khoản: {account.email}</p>
          <ResetPasswordForm />
        </>
      ) : (
        <p className="sample-notice">
          Liên kết đặt lại đã hết hạn hoặc chưa mở từ email.{" "}
          <Link href="/forgot-password">Gửi yêu cầu mới</Link>.
        </p>
      )}
    </div>
  );
}
