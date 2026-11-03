import Link from "next/link";

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
        Email đăng nhập: {account.email}. <Link href={defaultHomePath(account.role)}>Quay lại</Link>
      </p>
      <AccountNameForm fullName={account.fullName} />
      <PasswordChangeForm />
      <p className="small">
        <Link href="/settings/notifications">Cài đặt email nhắc học</Link>
      </p>
    </div>
  );
}
