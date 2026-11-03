import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { SignInForm } from "@/components/auth/sign-in-form";
import { defaultHomePath, safeNextPath } from "@/lib/auth-paths";
import { getCurrentAccount } from "@/lib/server/account";
import { isClassroomConfigured, isGoogleAuthEnabled } from "@/lib/server/supabase";

import type { SignInError } from "@/lib/auth-paths";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Đăng nhập" };

interface SignInPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

const SIGN_IN_ERRORS: Record<SignInError, string> = {
  link: "Liên kết trong email đã hết hạn hoặc đã được dùng. Đăng nhập hoặc gửi lại thư.",
  google: "Chưa đăng nhập được bằng Google. Bạn thử lại, hoặc dùng email và mật khẩu.",
  "google-cancelled": "Bạn đã dừng đăng nhập bằng Google. Thử lại hoặc dùng email và mật khẩu.",
};

function isSignInError(value: unknown): value is SignInError {
  return typeof value === "string" && Object.hasOwn(SIGN_IN_ERRORS, value);
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const query = await searchParams;
  const account = await getCurrentAccount();
  if (account) {
    redirect(safeNextPath(query.next, defaultHomePath(account.role)));
  }
  const nextPath = safeNextPath(query.next, "");
  const signUpHref = nextPath ? `/sign-up?next=${encodeURIComponent(nextPath)}` : "/sign-up";
  return (
    <div className="narrow-page">
      <h1>Đăng nhập</h1>
      <p className="muted">Dùng chung cho học viên và giảng viên.</p>
      {isSignInError(query.error) && (
        <p role="alert" className="error-text">
          {SIGN_IN_ERRORS[query.error]}
        </p>
      )}
      {isClassroomConfigured() ? (
        <>
          {isGoogleAuthEnabled() && (
            <GoogleSignIn nextPath={nextPath} label="Đăng nhập bằng Google" />
          )}
          <SignInForm nextPath={nextPath} />
          <p>
            Chưa có tài khoản? <Link href={signUpHref}>Tạo tài khoản học viên</Link>
          </p>
        </>
      ) : (
        <p className="sample-notice">
          Tài khoản và lớp học chưa được kích hoạt trên hệ thống này. Bạn vẫn có thể học bảng chữ
          cái và bài học công khai.
        </p>
      )}
    </div>
  );
}
