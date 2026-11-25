import { randomUUID } from "node:crypto";

import Link from "next/link";

import { CreateLessonForm } from "@/components/editor/create-lesson-form";
import { StarterLessonForm } from "@/components/editor/starter-lesson-form";
import { CreateTeachingLessonForm } from "@/components/teaching/create-teaching-lesson-form";
import { buttonVariants } from "@/components/ui/button";
import { requireTeacher } from "@/lib/server/account";
import { listOwnedLessons } from "@/lib/server/classes";
import {
  findStarterForLesson,
  MINNA_STARTERS,
  N4_REVIEW_STARTERS,
  N4_TIPS_STARTERS,
} from "@/lib/starter-lessons";

import type { StarterLesson } from "@/lib/starter-lessons";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tạo bài mới" };

export default async function NewLessonPage() {
  const account = await requireTeacher("/teach/lessons/new");
  const lessons = await listOwnedLessons(account.id);
  const nextOrder = lessons.length + 1;
  // A revisit can open the lesson already made from a starter instead of making a duplicate.
  const lessonFromStarter = new Map(
    lessons.flatMap((lesson) => {
      const starter = findStarterForLesson(lesson.creationFingerprint);
      return starter ? [[starter.id, lesson] as const] : [];
    }),
  );
  const renderStarters = (starters: readonly StarterLesson[]) => (
    <ul className="starter-grid">
      {starters.map((starter) => {
        const { content } = starter.draft;
        const existing = lessonFromStarter.get(starter.id);
        return (
          <li key={starter.id} className="starter-card">
            <div>
              <h3>{starter.draft.title}</h3>
              <p className="item-meta">
                {starter.course}
                {content.vocab.length > 0 && ` · ${content.vocab.length} từ vựng`} ·{" "}
                {content.grammar.length} mẫu câu · {content.slides.length} slide ·{" "}
                {content.questions.length} câu luyện
                {existing && ` · bạn đã tạo «${existing.title}»`}
              </p>
            </div>
            <div className="button-row">
              {existing && (
                <Link
                  href={`/teach/lessons/${existing.id}/edit`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Mở bài đã tạo
                </Link>
              )}
              <StarterLessonForm
                starterId={starter.id}
                requestId={randomUUID()}
                label={starter.buttonLabel}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tạo bài mới</h1>
          <p className="muted">
            <Link href="/teach">Giảng dạy</Link>. Bài mới là bản nháp riêng; học viên chỉ thấy sau
            khi bạn xuất bản và giao cho lớp.
          </p>
        </div>
      </div>
      {/* The starter list runs long, so each way of starting is a card that jumps to its part. */}
      <nav className="link-cards" aria-label="Chọn cách soạn bài">
        <Link href="#starter-lesson-title" className="link-card">
          <span className="link-card-title">Dùng bài mẫu Minna</span>
          <span className="small muted">
            Bài 1–50 có sẵn từ vựng, mẫu câu, hội thoại và câu luyện; sửa theo lớp rồi xuất bản.
          </span>
        </Link>
        <Link href="#n4-review-title" className="link-card">
          <span className="link-card-title">Tổng ôn ngữ pháp N4</span>
          <span className="small muted">
            Bản đồ và 8 bài theo chủ đề, gom các mẫu dễ nhầm, kèm câu luyện kiểu đề JLPT.
          </span>
        </Link>
        <Link href="#n4-tips-title" className="link-card">
          <span className="link-card-title">Mẹo học và thi N4</span>
          <span className="small muted">
            Cách làm đề, mẹo kanji, từ vựng, đọc, nghe và lịch ôn, có câu luyện áp dụng.
          </span>
        </Link>
        <Link href="#detailed-lesson-title" className="link-card">
          <span className="link-card-title">Soạn tiếng Nhật từ đầu</span>
          <span className="small muted">
            Tự nhập từ vựng, mẫu câu, câu luyện và slide trong trình soạn.
          </span>
        </Link>
        <Link href="#template-lesson-title" className="link-card">
          <span className="link-card-title">Soạn bài tiếng Trung</span>
          <span className="small muted">
            Năm bước theo mẫu, từ mục tiêu đến slide dựng sẵn từ nội dung bạn nhập.
          </span>
        </Link>
      </nav>
      <section className="section-block" aria-labelledby="starter-lesson-title">
        <h2 id="starter-lesson-title">Bắt đầu từ bài mẫu Minna no Nihongo</h2>
        <p className="small muted">
          Reng tự biên soạn bài mẫu theo trình tự bài học của giáo trình (từ vựng, bảng đếm, mẫu
          câu, hội thoại, luyện tập, câu hỏi), không chép nguyên văn sách. Bạn nhận một bản nháp
          riêng để kiểm tra, sửa rồi xuất bản; học viên dùng sách của mình để đối chiếu.
        </p>
        {renderStarters(MINNA_STARTERS)}
      </section>
      <section className="section-block" aria-labelledby="n4-review-title">
        <h2 id="n4-review-title">Tổng ôn ngữ pháp JLPT N4</h2>
        <p className="small muted">
          Gom ngữ pháp N4 theo chủ đề để ôn và tra khi làm đề: bài 0 là bản đồ mọi mẫu, bài 1–8 giải
          thích từng nhóm mẫu dễ nhầm, kèm ví dụ và câu luyện kiểu đề JLPT tự biên soạn. Thêm các
          bài vào lớp ôn N4 để học viên mở được trang Tra ngữ pháp của lớp khi làm bài.
        </p>
        {renderStarters(N4_REVIEW_STARTERS)}
      </section>
      <section className="section-block" aria-labelledby="n4-tips-title">
        <h2 id="n4-tips-title">Mẹo học và thi JLPT N4</h2>
        <p className="small muted">
          Cách làm đề, mẹo học kanji, từ vựng, ngữ pháp, đọc, nghe và lịch ôn trước ngày thi; mỗi
          mẹo có ví dụ và câu luyện để áp dụng ngay. Số liệu đề thi theo trang chính thức JLPT.
        </p>
        {renderStarters(N4_TIPS_STARTERS)}
      </section>
      <div className="create-lesson-columns">
        <section className="section-block" aria-labelledby="detailed-lesson-title">
          <h2 id="detailed-lesson-title">Soạn bài tiếng Nhật từ đầu</h2>
          <p className="small muted">
            Soạn từ đầu: từ vựng, mẫu câu, câu luyện và slide (tiêu đề, từ vựng, mẫu câu, ví dụ, hội
            thoại, bảng/luyện thay thế, câu hỏi). Muốn làm bài tiếp theo nhanh hơn, dùng Tạo bản sao
            của một bài đã có ở trang Giảng dạy.
          </p>
          <CreateLessonForm suggestedOrder={nextOrder} />
        </section>
        <section className="section-block" aria-labelledby="template-lesson-title">
          <h2 id="template-lesson-title">Soạn bài tiếng Trung theo mẫu</h2>
          <p className="small muted">
            Bắt đầu từ một mục tiêu nhỏ; hệ thống dẫn từng bước và dựng slide từ nội dung bạn nhập.
          </p>
          <CreateTeachingLessonForm requestId={randomUUID()} suggestedOrder={nextOrder} />
        </section>
      </div>
    </>
  );
}
