"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

interface AppErrorProps {
  retry: () => void;
}

// Fallback for unexpected errors outside sections with their own boundary, so a failure
// shows a way back instead of the browser's blank "Application error" page.
export default function AppError({ retry }: AppErrorProps) {
  return (
    <div className="prose-page">
      <h1>Trang chưa hiển thị được</h1>
      <p>
        Có thể mạng vừa bị gián đoạn hoặc Reng vừa được cập nhật. Bạn thử lại; nếu vẫn lỗi, tải lại
        trang. Bài đang soạn và bài đang làm có thay đổi chưa lưu được giữ trên máy này để khôi phục
        khi mở lại.
      </p>
      <div className="button-row">
        <Button onClick={retry}>Thử lại</Button>
        <Link href="/">Về trang chủ</Link>
      </div>
    </div>
  );
}
