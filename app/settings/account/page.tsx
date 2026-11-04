import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AccountNameForm, PasswordChangeForm } from "@/components/settings/account-forms";
import { defaultHomePath } from "@/lib/auth-paths";
import { requireAccount } from "@/lib/server/account";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tài khoản" };

export default async function AccountSettingsPage() {
  const account = await requireAccount("/settings/account");
  return (
    <div className="narrow-page">
      <h1>Tài khoản</h1>
      <p className="muted">
        Đang đăng nhập: {account.fullName || account.email} ({account.email}).{" "}
        <Link href={defaultHomePath(account.role)}>Quay lại</Link>
      </p>
      <nav className="button-row account-links" aria-label="Trang của bạn">
        <Link href="/progress">Tiến độ của tôi</Link>
        <Link href="/mistakes">Sổ lỗi</Link>
        <Link href="/settings/notifications">
          {account.role === "teacher" ? "Email nhắc học và tóm tắt lớp" : "Cài đặt email nhắc học"}
        </Link>
      </nav>
      <AccountNameForm fullName={account.fullName} />
      <PasswordChangeForm />
      <SignOutButton />
    </div>
  );
}
