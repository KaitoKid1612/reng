import Link from "next/link";

import { StarterRefreshForm } from "@/components/editor/starter-refresh-form";
import { requireTeacher } from "@/lib/server/account";
import { loadStarterRefresh } from "@/lib/server/lessons";
import { loadOrNotFound } from "@/lib/server/pages";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cập nhật từ bài mẫu" };

interface StarterRefreshPageProps {
  params: Promise<{ id: string }>;
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
        <h2 id="starter-compare">So sánh với mẫu mới nhất: {refresh.starter.draft.title}</h2>
        {refresh.sections ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Phần</th>
                  <th scope="col" className="numeric">
                    Bản nháp của bạn
                  </th>
                  <th scope="col" className="numeric">
                    Mẫu mới nhất
                  </th>
                  <th scope="col">Nội dung</th>
                </tr>
              </thead>
              <tbody>
                {refresh.sections.map((section) => (
                  <tr key={section.label}>
                    <td>{section.label}</td>
                    <td className="numeric" data-label="Bản nháp của bạn">
                      {section.draftCount}
                    </td>
                    <td className="numeric" data-label="Mẫu mới nhất">
                      {section.starterCount}
                    </td>
                    <td data-label="Nội dung">{section.isSame ? "Giống mẫu" : "Khác mẫu"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="notice-panel">Không đọc được bản nháp hiện tại để so sánh.</p>
        )}
      </section>
      {refresh.isUpToDate ? (
        <section className="section-block" aria-labelledby="starter-refresh">
          <h2 id="starter-refresh">Không có gì để cập nhật</h2>
          <p>
            Bản nháp đang giống hệt bài mẫu mới nhất.{" "}
            <Link href={`/teach/lessons/${refresh.lessonId}/edit`}>Quay lại soạn bài</Link>.
          </p>
        </section>
      ) : (
        <section className="section-block" aria-labelledby="starter-refresh">
          <h2 id="starter-refresh">Thay bản nháp</h2>
          <p>
            Bài này được tạo từ mẫu {refresh.starter.course}. Mẫu được bổ sung dần (hình từ vựng,
            slide hình, câu luyện), nhưng bài đã tạo từ mẫu không tự cập nhật. Phần ghi Khác mẫu có
            thể là nội dung mẫu mới, hoặc chỉnh sửa riêng của bạn.
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
              Sau khi thay: xem lại, xuất bản, rồi bấm Cập nhật lên phiên bản mới ở mục Dùng bài
              trong lớp khi muốn học viên thấy.
            </li>
          </ul>
          <StarterRefreshForm lessonId={refresh.lessonId} revision={refresh.revision} />
        </section>
      )}
    </>
  );
}
