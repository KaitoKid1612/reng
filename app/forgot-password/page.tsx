import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return (
    <div className="narrow-page">
      <h1>Quên mật khẩu</h1>
      <p className="muted">Nhập email đã đăng ký. Reng sẽ gửi liên kết để bạn đặt mật khẩu mới.</p>
      <ForgotPasswordForm />
      <p>
        Nhớ ra rồi? <Link href="/sign-in">Đăng nhập</Link>
      </p>
    </div>
  );
}
