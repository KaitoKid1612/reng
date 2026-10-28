import Link from "next/link";

import { ResendConfirmationForm } from "@/components/auth/resend-confirmation-form";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Xác nhận email" };

export default function VerifyEmailPage() {
  return (
    <div className="narrow-page">
      <h1>Xác nhận email</h1>
      <p>
        Mở thư “Xác nhận email Masu” và bấm liên kết trong thư. Liên kết dùng được một lần; nếu đã
        hết hạn, nhập email để nhận thư mới.
      </p>
      <div className="form-card">
        <ResendConfirmationForm nextPath="/classes" />
      </div>
      <p>
        Đã xác nhận xong? <Link href="/sign-in">Đăng nhập</Link>
      </p>
    </div>
  );
}
