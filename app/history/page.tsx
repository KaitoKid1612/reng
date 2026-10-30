import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireAccount } from "@/lib/server/account";
import { listLearningHistory } from "@/lib/server/learning-history";
import { formatStudyDateTime } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lịch sử học tập",
  robots: { index: false, follow: false },
};

export default async function HistoryPage() {
  const account = await requireAccount("/history");
  const archives = await listLearningHistory();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Lịch sử học tập</h1>
          <p>Kết quả trước đây được nhập từ Google Sheet, giữ nguyên cách chấm và điểm gốc.</p>
        </div>
        <div className="button-row">
          <Link href="/classes" className={buttonVariants({ variant: "outline" })}>
            Lớp tôi đang học
          </Link>
          {account.role === "teacher" && (
            <Link href="/teach" className={buttonVariants({ variant: "outline" })}>
              Giảng dạy
            </Link>
          )}
        </div>
      </div>
      <p className="notice-panel">
        Bạn chỉ thấy lịch sử của mình hoặc học viên được giao cho bạn xem. Bài tập mới làm trên Reng
        nằm trong Lớp của tôi và Tiến độ; lịch sử nhập không tự tạo lượt nộp bài hoặc điểm mới.
      </p>
      {archives.length ? (
        <ul className="item-list">
          {archives.map((archive) => (
            <li key={archive.id}>
              <div>
                <h2>
                  <Link href={`/history/${archive.id}`}>
                    {archive.learner_name} — {archive.course}
                  </Link>
                </h2>
                {!archive.learner_id && (
                  <p className="small muted">Chờ giáo viên liên kết sau khi học viên đăng ký.</p>
                )}
                <p className="item-meta">
                  {archive.session_count} dòng tổng hợp · {archive.answer_count} câu trong lịch sử
                </p>
                <p className="small muted">Nhập lúc {formatStudyDateTime(archive.imported_at)}</p>
              </div>
              <Link
                href={`/history/${archive.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Xem lịch sử
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sample-notice">
          Chưa có lịch sử Google Sheet được gắn với tài khoản của bạn. Dữ liệu chỉ xuất hiện sau khi
          được nhập đúng tài khoản.
        </p>
      )}
    </>
  );
}
