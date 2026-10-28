import Link from "next/link";

import { CreateLessonForm } from "@/components/editor/create-lesson-form";
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
        <Link href="/teach">Giảng dạy</Link>. Bài mới là bản nháp; học viên chỉ thấy sau khi bạn
        xuất bản.
      </p>
      <CreateLessonForm
        suggestedId={`lesson-${String(nextOrder).padStart(2, "0")}`}
        suggestedOrder={nextOrder}
      />
    </div>
  );
}
