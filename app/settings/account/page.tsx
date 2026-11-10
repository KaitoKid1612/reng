import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AccountNameForm, PasswordChangeForm } from "@/components/settings/account-forms";
import { SettingsNav } from "@/components/settings/settings-nav";
import { requireAccount } from "@/lib/server/account";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tài khoản" };

export default async function AccountSettingsPage() {
  const account = await requireAccount("/settings/account");
  return (
    <div className="settings-page">
      <div className="page-heading">
        <div>
          <h1>Tài khoản</h1>
          <p className="muted">
            Đang đăng nhập: {account.fullName || account.email} ({account.email})
          </p>
        </div>
        <SignOutButton />
      </div>
      <SettingsNav current="account" />
      <div className="settings-grid">
        <AccountNameForm fullName={account.fullName} />
        <PasswordChangeForm />
      </div>
      <section className="section-block" aria-labelledby="study-links-title">
        <h2 id="study-links-title">Việc học của bạn</h2>
        <div className="link-cards">
          <Link href="/progress" className="link-card">
            <span className="link-card-title">Tiến độ của tôi</span>
            <span className="small muted">
              Bài đã đọc, kết quả bài tập, chuỗi ngày học và thẻ ôn tập
            </span>
          </Link>
          <Link href="/mistakes" className="link-card">
            <span className="link-card-title">Sổ lỗi</span>
            <span className="small muted">Câu đã làm sai, ôn lại tới khi đúng 3 lần liên tiếp</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
