import { Download } from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  AccountNameForm,
  DeleteAccountForm,
  PasswordChangeForm,
} from "@/components/settings/account-forms";
import { BoardVisibilityForm } from "@/components/settings/board-visibility-form";
import { SettingsNav } from "@/components/settings/settings-nav";
import { buttonVariants } from "@/components/ui/button";
import { ContactEmail } from "@/components/legal/contact-email";
import { requireAccount } from "@/lib/server/account";
import { accountHasPassword } from "@/lib/server/password-check";
import { isHiddenFromBoard } from "@/lib/server/weekly-board";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tài khoản" };

export default async function AccountSettingsPage() {
  const account = await requireAccount("/settings/account");
  // Before the board's migration the setting cannot be read; the form then shows it unticked.
  const [isHidden, hasPassword] = await Promise.all([
    isHiddenFromBoard(account.id).catch(() => false),
    // Asking for the current password is the safe side when the lookup fails.
    accountHasPassword(account.id).catch(() => true),
  ]);
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
        <PasswordChangeForm hasPassword={hasPassword} />
        <BoardVisibilityForm isHidden={isHidden} />
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
      <section className="section-block" aria-labelledby="export-title">
        <h2 id="export-title">Tải dữ liệu của tôi</h2>
        <p className="small muted">
          Một tệp dữ liệu (định dạng JSON) gồm thông tin tài khoản, lớp đã vào, bài đã làm, bài đã
          đọc, ôn tập, điểm danh và cài đặt nhắc học. Bài kiểm tra chưa tới giờ giáo viên công bố
          kết quả chỉ có thời điểm nộp. Xem thêm ở{" "}
          <Link href="/privacy">Chính sách quyền riêng tư</Link>.
        </p>
        {/* A plain link: the browser saves the file and the page stays where it is. */}
        <a href="/api/me/export" download className={buttonVariants({ variant: "outline" })}>
          <Download size={16} aria-hidden="true" />
          Tải dữ liệu của tôi
        </a>
      </section>
      {account.role === "teacher" ? (
        <section className="section-block" aria-labelledby="delete-account-title">
          <h2 id="delete-account-title">Xóa tài khoản</h2>
          <p className="small muted">
            Tài khoản dạy học không tự xóa được, vì lớp, bài học và kết quả của học viên có thể phụ
            thuộc vào nó. Muốn ngừng dùng Reng, gửi yêu cầu về <ContactEmail /> để quản trị viên
            chuyển hoặc đóng lớp rồi xóa tài khoản.
          </p>
        </section>
      ) : (
        <DeleteAccountForm />
      )}
    </div>
  );
}
