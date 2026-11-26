import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { isGoogleAuthEnabled } from "@/lib/server/supabase";
import { isRequestFromInAppBrowser } from "@/lib/server/in-app-browser";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Quên mật khẩu" };

// Google sign-in joins the account with the same email, so a Gmail user gets back in without
// the reset email, which production cannot always deliver yet.
export default async function ForgotPasswordPage() {
  return (
    <div className="narrow-page">
      <h1>Quên mật khẩu</h1>
      {isGoogleAuthEnabled() && (
        <>
          <p className="muted">
            Email của bạn là Gmail? Đăng nhập bằng Google để vào ngay, không cần mật khẩu.
          </p>
          <GoogleSignIn
            nextPath=""
            label="Đăng nhập bằng Google"
            isInAppBrowser={await isRequestFromInAppBrowser()}
          />
        </>
      )}
      <p className="muted">Nhập email đã đăng ký. Reng sẽ gửi link để bạn đặt mật khẩu mới.</p>
      <ForgotPasswordForm />
      <p>
        Nhớ ra rồi? <Link href="/sign-in">Đăng nhập</Link>
      </p>
    </div>
  );
}
