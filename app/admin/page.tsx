import Link from "next/link";

import { ApprovalSettingForm } from "@/components/admin/approval-setting-form";
import { loadAdminOverview, loadPlatformSettings, requireAdmin } from "@/lib/server/admin";
import { toStudyDay } from "@/lib/study-days";

const DAY_MS = 86_400_000;

export default async function AdminPage() {
  await requireAdmin("/admin");
  const now = new Date();
  const [overview, settings] = await Promise.all([
    loadAdminOverview(toStudyDay(now), new Date(now.getTime() - 7 * DAY_MS).toISOString()),
    loadPlatformSettings(),
  ]);
  const stats = [
    { label: "Giáo viên đang dạy", value: overview.teachers.active },
    { label: "Yêu cầu chờ duyệt", value: overview.teachers.pending },
    { label: "Giáo viên tạm dừng", value: overview.teachers.suspended },
    { label: "Học viên đang trong lớp", value: overview.activeLearners },
    { label: "Lớp đang hoạt động", value: overview.activeClasses },
    { label: "Bài học", value: overview.lessons },
    { label: "Phiên bản đã xuất bản", value: overview.publishedVersions },
    { label: "Bài nộp 7 ngày qua", value: overview.submissionsLastWeek },
    { label: "Tổng tài khoản", value: overview.accounts },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Quản trị</h1>
          <p>Theo dõi giáo viên thuê, lớp học và hoạt động của nền tảng.</p>
        </div>
        <div className="button-row">
          <Link href="/admin/teachers">Giáo viên</Link>
          <Link href="/admin/activity">Nhật ký hoạt động</Link>
        </div>
      </div>
      {overview.teachers.pending > 0 && (
        <p className="notice-panel">
          Có {overview.teachers.pending} yêu cầu giảng dạy đang chờ.{" "}
          <Link href="/admin/teachers">Xem và duyệt</Link>
        </p>
      )}
      {overview.expiredTeachers > 0 && (
        <p className="notice-panel">
          {overview.expiredTeachers} giáo viên đã quá hạn thuê nhưng vẫn đang dạy. Hệ thống không tự
          khóa; hãy gia hạn hoặc tạm dừng ở <Link href="/admin/teachers">danh sách giáo viên</Link>.
        </p>
      )}
      <section className="section-block" aria-labelledby="admin-stats">
        <h2 id="admin-stats">Tổng quan</h2>
        <dl className="admin-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="section-block" aria-labelledby="admin-settings">
        <h2 id="admin-settings">Đăng ký giáo viên</h2>
        <ApprovalSettingForm isRequired={settings.teacherApprovalRequired} />
      </section>
    </>
  );
}
