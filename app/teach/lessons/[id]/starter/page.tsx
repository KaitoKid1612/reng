import Link from "next/link";

import { StarterRefreshForm } from "@/components/editor/starter-refresh-form";
import { requireTeacher } from "@/lib/server/account";
import { loadStarterRefresh } from "@/lib/server/lessons";
import { loadOrNotFound } from "@/lib/server/pages";

import type { LessonContentSummary } from "@/lib/starter-lessons";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cập nhật từ bài mẫu" };

interface StarterRefreshPageProps {
  params: Promise<{ id: string }>;
}

function describeContent(summary: LessonContentSummary) {
  return `${summary.slides} slide, ${summary.questions} câu hỏi, ${summary.pictures} hình`;
}

export default async function StarterRefreshPage({ params }: StarterRefreshPageProps) {
  const { id } = await params;
  const account = await requireTeacher(`/teach/lessons/${id}/starter`);
  const refresh = await loadOrNotFound(loadStarterRefresh(account.id, id));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Cập nhật từ bài mẫu: {refresh.title}</h1>
          <p>
            <Link href="/teach">Giảng dạy</Link>,{" "}
            <Link href={`/teach/lessons/${refresh.lessonId}/edit`}>soạn bài</Link>
          </p>
        </div>
      </div>
      <section className="section-block" aria-labelledby="starter-compare">
        <h2 id="starter-compare">So sánh</h2>
        <ul className="item-list">
          <li>
            <span>Bản nháp của bạn</span>
            <span className="item-meta">
              {refresh.current ? describeContent(refresh.current) : "Không đọc được bản nháp"}
            </span>
          </li>
          <li>
            <span>Mẫu mới nhất: {refresh.starter.draft.title}</span>
            <span className="item-meta">{describeContent(refresh.latest)}</span>
          </li>
        </ul>
      </section>
      <section className="section-block" aria-labelledby="starter-refresh">
        <h2 id="starter-refresh">Thay bản nháp</h2>
        <p>
          Bài này được tạo từ mẫu {refresh.starter.course}. Mẫu được bổ sung dần (hình từ vựng,
          slide hình, câu luyện), nhưng bài đã tạo từ mẫu không tự cập nhật.
        </p>
        <ul>
          <li>
            Nội dung bản nháp được thay bằng mẫu mới nhất; tên, thứ tự và khóa học giữ nguyên.
          </li>
          <li>
            Chỉnh sửa riêng của bạn trong bản nháp sẽ mất. Phiên bản đã xuất bản, lớp đang dùng và
            bài đã giao không đổi.
          </li>
          <li>
            Sau khi thay: xem lại, xuất bản, rồi chọn phiên bản mới cho lớp ở trang Giao bài khi
            muốn học viên thấy.
          </li>
        </ul>
        <StarterRefreshForm lessonId={refresh.lessonId} revision={refresh.revision} />
      </section>
    </>
  );
}
