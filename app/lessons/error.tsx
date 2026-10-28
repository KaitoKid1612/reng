"use client";

import { Button } from "@/components/ui/button";

interface LessonErrorProps {
  reset: () => void;
}

export default function LessonError({ reset }: LessonErrorProps) {
  return (
    <div className="prose-page">
      <h1>Chưa tải được bài học</h1>
      <p>Nguồn bài học đang chưa phản hồi. Bạn thử lại sau một chút nhé.</p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
