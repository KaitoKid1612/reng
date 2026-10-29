import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { defaultHomePath, safeNextPath } from "@/lib/auth-paths";
import { getCurrentAccount } from "@/lib/server/account";
import { isClassroomConfigured } from "@/lib/server/supabase";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tạo tài khoản" };

interface SignUpPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const query = await searchParams;
  const account = await getCurrentAccount();
  if (account) {
    redirect(safeNextPath(query.next, defaultHomePath(account.role)));
  }
  const nextPath = safeNextPath(query.next, "/classes");
  return (
    <div className="narrow-page">
      <h1>Tạo tài khoản học viên</h1>
      <p>
        <Link href="/sign-up/teacher">Tôi muốn đăng ký giáo viên</Link>
      </p>
      <p className="muted">
        Chỉ cần họ tên và email. Bạn có thể đăng ký giảng dạy bằng cùng tài khoản.
      </p>
      {isClassroomConfigured() ? (
        <>
          <SignUpForm nextPath={nextPath} />
          <p>
            Đã có tài khoản?{" "}
            <Link href={`/sign-in?next=${encodeURIComponent(nextPath)}`}>Đăng nhập</Link>
          </p>
        </>
      ) : (
        <p className="sample-notice">Đăng ký chưa được kích hoạt trên hệ thống này.</p>
      )}
    </div>
  );
}
