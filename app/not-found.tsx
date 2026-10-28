import Link from "next/link";

export default function NotFound() {
  return (
    <div className="prose-page">
      <h1>Trang này chưa có</h1>
      <p>Bạn có thể quay lại bảng chữ cái để tiếp tục học.</p>
      <Link href="/kana">Mở bảng chữ cái</Link>
    </div>
  );
}
