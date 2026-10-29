import { randomUUID } from "node:crypto";

import Link from "next/link";

import { CreateLessonForm } from "@/components/editor/create-lesson-form";
import { CreateTeachingLessonForm } from "@/components/teaching/create-teaching-lesson-form";
import { requireTeacher } from "@/lib/server/account";
import { listOwnedLessons } from "@/lib/server/classes";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tạo bài mới" };

export default async function NewLessonPage() {
  const account = await requireTeacher("/teach/lessons/new");
  const lessons = await listOwnedLessons(account.id);
  const nextOrder = lessons.length + 1;
  return (
    <div className="narrow-page">
      <h1>Tạo bài mới</h1>
      <p className="muted">
        <Link href="/teach">Giảng dạy</Link>. Bài mới là bản nháp riêng; học viên chỉ thấy sau khi
        bạn xuất bản và giao cho lớp.
      </p>
      <section className="section-block" aria-labelledby="template-lesson-title">
        <h2 id="template-lesson-title">Soạn bài tiếng Trung theo mẫu</h2>
        <p className="small muted">
          Bắt đầu từ một mục tiêu nhỏ; hệ thống dẫn từng bước và dựng slide từ nội dung bạn nhập.
        </p>
        <CreateTeachingLessonForm requestId={randomUUID()} suggestedOrder={nextOrder} />
      </section>
      <section className="section-block" aria-labelledby="detailed-lesson-title">
        <h2 id="detailed-lesson-title">Soạn chi tiết bài tiếng Nhật</h2>
        <p className="small muted">Editor cũ cho bài tiếng Nhật với từng khối và slide tự chọn.</p>
        <CreateLessonForm
          suggestedId={`lesson-${String(nextOrder).padStart(2, "0")}`}
          suggestedOrder={nextOrder}
        />
      </section>
    </div>
  );
}
