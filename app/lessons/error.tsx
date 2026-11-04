"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

interface LessonErrorProps {
  retry: () => void;
}

// retry fetches the lesson again; reset would only redraw the failure that was already received.
export default function LessonError({ retry }: LessonErrorProps) {
  return (
    <div className="prose-page">
      <h1>Chưa tải được bài học</h1>
      <p>Nguồn bài học đang chưa phản hồi. Bạn thử lại sau một chút nhé.</p>
      <div className="button-row">
        <Button onClick={retry}>Thử lại</Button>
        <Link href="/">Về trang chủ</Link>
      </div>
    </div>
  );
}
