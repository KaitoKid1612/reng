import Link from "next/link";

import { describeAuditAction } from "@/lib/admin-labels";
import { listRecentActivity, requireAdmin } from "@/lib/server/admin";
import { formatStudyDateTime } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nhật ký hoạt động" };

export default async function AdminActivityPage() {
  await requireAdmin("/admin/activity");
  const events = await listRecentActivity(100);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Nhật ký hoạt động</h1>
          <p>
            <Link href="/admin">Quản trị</Link>. 100 thao tác gần nhất về giáo viên, chia sẻ và công
            khai bài học.
          </p>
        </div>
      </div>
      {events.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Thời điểm</th>
                <th scope="col">Người thực hiện</th>
                <th scope="col">Thao tác</th>
                <th scope="col">Đối tượng</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{formatStudyDateTime(event.createdAt)}</td>
                  <td>{event.actorName || "—"}</td>
                  <td>{describeAuditAction(event.action)}</td>
                  <td className="small">{event.resourceId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Chưa có hoạt động nào.</p>
      )}
    </>
  );
}
