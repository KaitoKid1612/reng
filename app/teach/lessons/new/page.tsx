import { randomUUID } from "node:crypto";

import Link from "next/link";

import { CreateLessonForm } from "@/components/editor/create-lesson-form";
import { StarterLessonForm } from "@/components/editor/starter-lesson-form";
import { CreateTeachingLessonForm } from "@/components/teaching/create-teaching-lesson-form";
import { requireTeacher } from "@/lib/server/account";
import { listOwnedLessons } from "@/lib/server/classes";
import { STARTER_LESSONS } from "@/lib/starter-lessons";

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
      <section className="section-block" aria-labelledby="starter-lesson-title">
        <h2 id="starter-lesson-title">Bắt đầu từ bài mẫu Minna no Nihongo</h2>
        <p className="small muted">
          Reng tự biên soạn bài mẫu theo trình tự bài học của giáo trình (từ vựng, bảng đếm, mẫu
          câu, hội thoại, luyện tập, câu hỏi), không chép nguyên văn sách. Bạn nhận một bản nháp
          riêng để kiểm tra, sửa rồi xuất bản; học viên dùng sách của mình để đối chiếu.
        </p>
        <ul className="item-list">
          {STARTER_LESSONS.map((starter) => {
            const { content } = starter.draft;
            return (
              <li key={starter.id}>
                <div>
                  <h3>{starter.draft.title}</h3>
                  <p className="item-meta">
                    {starter.course} · {content.vocab.length} từ vựng · {content.grammar.length} mẫu
                    câu · {content.slides.length} slide · {content.questions.length} câu luyện
                  </p>
                </div>
                <StarterLessonForm
                  starterId={starter.id}
                  requestId={randomUUID()}
                  label={starter.buttonLabel}
                />
              </li>
            );
          })}
        </ul>
      </section>
      <section className="section-block" aria-labelledby="detailed-lesson-title">
        <h2 id="detailed-lesson-title">Soạn bài tiếng Nhật</h2>
        <p className="small muted">
          Soạn từ đầu: từ vựng, mẫu câu, câu luyện và slide (tiêu đề, từ vựng, mẫu câu, ví dụ, hội
          thoại, bảng/luyện thay thế, câu hỏi). Muốn làm bài tiếp theo nhanh hơn, dùng Tạo bản sao
          của một bài đã có ở trang Giảng dạy.
        </p>
        <CreateLessonForm
          suggestedId={`lesson-${String(nextOrder).padStart(2, "0")}`}
          suggestedOrder={nextOrder}
        />
      </section>
      <section className="section-block" aria-labelledby="template-lesson-title">
        <h2 id="template-lesson-title">Soạn bài tiếng Trung theo mẫu</h2>
        <p className="small muted">
          Bắt đầu từ một mục tiêu nhỏ; hệ thống dẫn từng bước và dựng slide từ nội dung bạn nhập.
        </p>
        <CreateTeachingLessonForm requestId={randomUUID()} suggestedOrder={nextOrder} />
      </section>
    </div>
  );
}
