import Link from "next/link";

import { TeacherPlanForm } from "@/components/admin/teacher-plan-form";
import { TeacherStatusForm } from "@/components/admin/teacher-status-form";
import { TEACHER_STATUS_LABELS } from "@/lib/admin-labels";
import { listTeacherAccounts, requireAdmin } from "@/lib/server/admin";
import { formatStudyDateTime, formatStudyDay, toStudyDay } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Giáo viên" };

const STATUS_TONES = {
  pending: "status-attention",
  active: "status-correct",
  suspended: "status-neutral",
} as const;

export default async function AdminTeachersPage() {
  await requireAdmin("/admin/teachers");
  const teachers = await listTeacherAccounts();
  const today = toStudyDay(new Date());
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Giáo viên</h1>
          <p>
            <Link href="/admin">Quản trị</Link>. Duyệt yêu cầu, tạm dừng khi hết hạn thuê và ghi chú
            thanh toán.
          </p>
        </div>
      </div>
      {teachers.length ? (
        <ul className="item-list admin-teachers">
          {teachers.map((teacher) => {
            const label = teacher.fullName || teacher.email;
            const isExpired =
              teacher.status === "active" &&
              teacher.accessUntil !== null &&
              teacher.accessUntil < today;
            return (
              <li key={teacher.userId}>
                <div>
                  <h3>
                    {label}{" "}
                    <span className={`status-badge ${STATUS_TONES[teacher.status]}`}>
                      {TEACHER_STATUS_LABELS[teacher.status]}
                    </span>{" "}
                    {isExpired && <span className="status-badge status-wrong">Quá hạn thuê</span>}
                  </h3>
                  <p className="item-meta">
                    {teacher.email} · {teacher.classCount} lớp · {teacher.studentCount} học viên ·{" "}
                    {teacher.lessonCount} bài
                  </p>
                  <p className="item-meta">
                    {teacher.requestedAt
                      ? `Yêu cầu ${formatStudyDateTime(teacher.requestedAt)}`
                      : "Cấp từ trước"}
                    {teacher.activatedAt
                      ? ` · mở quyền ${formatStudyDateTime(teacher.activatedAt)}`
                      : ""}
                    {teacher.accessUntil
                      ? ` · hạn thuê ${formatStudyDay(teacher.accessUntil)}`
                      : ""}
                  </p>
                </div>
                <div className="admin-teacher-actions">
                  <TeacherStatusForm
                    userId={teacher.userId}
                    status={teacher.status}
                    teacherLabel={label}
                  />
                  <TeacherPlanForm
                    userId={teacher.userId}
                    accessUntil={teacher.accessUntil}
                    note={teacher.note}
                    teacherLabel={label}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>Chưa có giáo viên nào.</p>
      )}
    </>
  );
}
