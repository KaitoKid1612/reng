import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Đã xóa tài khoản" };

// Where a learner lands after deleting their account (app/actions/auth.ts, deleteOwnAccount).
export default function AccountDeletedPage() {
  return (
    <div className="narrow-page">
      <h1>Đã xóa tài khoản</h1>
      <p className="muted">
        Họ tên, email và cách đăng nhập của bạn đã được xóa; bạn đã rời mọi lớp. Bài đã nộp vẫn ở
        lại trong thống kê của lớp dưới tên “Học viên đã xóa”. Cảm ơn bạn đã học cùng Reng.
      </p>
      <p>
        <Link href="/">Về trang chủ</Link>
      </p>
    </div>
  );
}
