import Link from "next/link";

export default function NotFound() {
  return (
    <div className="prose-page">
      <h1>Trang này chưa có</h1>
      <p>Đường dẫn có thể đã đổi hoặc bị gõ nhầm.</p>
      <div className="button-row">
        <Link href="/">Về trang chủ</Link>
        <Link href="/classes">Lớp của tôi</Link>
      </div>
    </div>
  );
}
