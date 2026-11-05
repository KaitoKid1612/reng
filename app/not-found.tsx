import Link from "next/link";

export default function NotFound() {
  return (
    <div className="prose-page">
      <h1>Trang này chưa có</h1>
      <p>Đường dẫn có thể đã đổi hoặc bị gõ nhầm.</p>
      {/* Private pages answer 404 to accounts without access, so a learner signed in with
          another account (for example a second Google account) lands here from a valid link. */}
      <p>
        Link lớp, bài học hay bài tập chỉ mở được bằng tài khoản có quyền. Nếu bạn mở từ link giáo
        viên gửi, kiểm tra bạn đang đăng nhập đúng tài khoản ở mục{" "}
        <Link href="/settings/account">Tài khoản</Link>.
      </p>
      <div className="button-row">
        <Link href="/">Về trang chủ</Link>
        <Link href="/classes">Lớp của tôi</Link>
      </div>
    </div>
  );
}
