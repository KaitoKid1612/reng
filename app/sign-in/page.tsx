import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { defaultHomePath, safeNextPath } from "@/lib/auth-paths";
import { getCurrentAccount } from "@/lib/server/account";
import { isClassroomConfigured } from "@/lib/server/supabase";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Đăng nhập" };

interface SignInPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

const LINK_ERROR = "Liên kết trong email đã hết hạn hoặc đã được dùng. Đăng nhập hoặc gửi lại thư.";

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
      {query.error === "link" && (
        <p role="alert" className="error-text">
          {LINK_ERROR}
        </p>
      )}
      {isClassroomConfigured() ? (
        <>
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
