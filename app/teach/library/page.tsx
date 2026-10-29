import { randomUUID } from "node:crypto";

import Link from "next/link";

import { LessonCopyForm } from "@/components/teach/lesson-copy-form";
import { requireTeacher } from "@/lib/server/account";
import { listSharedWithMe } from "@/lib/server/lesson-sharing";
import { formatStudyDateTime } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Thư viện chia sẻ" };

export default async function TeachingLibraryPage() {
  const account = await requireTeacher("/teach/library");
  const shared = await listSharedWithMe(account.id);
  return (
    <div className="narrow-page">
      <h1>Bài được chia sẻ với tôi</h1>
      <p className="muted">
        <Link href="/teach">Giảng dạy</Link>. Bạn xem đúng phiên bản giáo viên đã chia sẻ. Muốn dạy
        lớp mình, hãy sao chép thành bài của bạn rồi kiểm tra và xuất bản lại.
      </p>
      {shared.length ? (
        <ul className="item-list">
          {shared.map((item) => (
            <li key={item.shareId}>
              <div>
                <h3>{item.title}</h3>
                <p className="item-meta">
                  {item.courseId === "chinese" ? "Tiếng Trung" : "Tiếng Nhật"} · phiên bản{" "}
                  {item.versionNo} · của {item.ownerName || "một giáo viên"} · nhận{" "}
                  {formatStudyDateTime(item.grantedAt)}
                </p>
              </div>
              <div className="button-row">
                <Link href={`/lessons/${item.lessonId}?version=${item.versionId}`}>Xem bài</Link>
                <Link href={`/lessons/${item.lessonId}/slide?version=${item.versionId}#1`}>
                  Trình chiếu
                </Link>
                {item.permission === "copy" ? (
                  <LessonCopyForm
                    source={{ kind: "shared", shareId: item.shareId }}
                    requestId={randomUUID()}
                    label="Sao chép thành bài của tôi"
                  />
                ) : (
                  <span className="small muted">Chỉ xem</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>Chưa có bài nào được chia sẻ với bạn.</p>
      )}
    </div>
  );
}
