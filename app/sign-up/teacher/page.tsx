import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { LegalConsent } from "@/components/auth/legal-consent";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentAccount } from "@/lib/server/account";
import { isClassroomConfigured, isGoogleAuthEnabled } from "@/lib/server/supabase";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký giáo viên",
  description:
    "Tạo tài khoản giáo viên trên Reng để mở lớp online, soạn slide theo mẫu và giao bài tập tự chấm.",
  alternates: { canonical: "/sign-up/teacher" },
};

export default async function TeacherSignUpPage() {
  if (await getCurrentAccount()) {
    redirect("/teach/start");
  }
  return (
    <div className="narrow-page">
      <h1>Đăng ký giáo viên</h1>
      <p>
        Tạo tài khoản, sau đó xác nhận trách nhiệm nội dung để bắt đầu giảng dạy. Nếu Reng gửi thư
        xác nhận, mở thư và bấm liên kết trước.
      </p>
      {isClassroomConfigured() ? (
        <>
          {isGoogleAuthEnabled() && (
            <GoogleSignIn nextPath="/teach/start" label="Đăng ký bằng Google" />
          )}
          <SignUpForm nextPath="/teach/start" />
          <LegalConsent />
        </>
      ) : (
        <p className="sample-notice">Đăng ký chưa được kích hoạt trên hệ thống này.</p>
      )}
      <p className="inline-links">
        Đã có tài khoản? <Link href="/sign-in?next=/teach/start">Đăng nhập</Link>
      </p>
    </div>
  );
}
