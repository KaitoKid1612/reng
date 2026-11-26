import Link from "next/link";

import { TeacherPlanForm } from "@/components/admin/teacher-plan-form";
import { TeacherStatusForm } from "@/components/admin/teacher-status-form";
import {
  describeTeacherStatusOutcome,
  TEACHER_STATUS_OUTCOMES,
  teacherStatusLabel,
} from "@/lib/admin-labels";
import { listTeacherAccounts, requireAdmin } from "@/lib/server/admin";
import { formatStudyDateTime, formatStudyDay, toStudyDay } from "@/lib/study-days";

import type { TeacherStatusOutcome } from "@/lib/admin-labels";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Giáo viên" };

const STATUS_TONES = {
  pending: "status-attention",
  active: "status-correct",
  suspended: "status-neutral",
} as const;

interface AdminTeachersPageProps {
  searchParams: Promise<{ changed?: string | string[]; outcome?: string | string[] }>;
}

function isOutcome(value: unknown): value is TeacherStatusOutcome {
  return TEACHER_STATUS_OUTCOMES.some((outcome) => outcome === value);
}

export default async function AdminTeachersPage({ searchParams }: AdminTeachersPageProps) {
  await requireAdmin("/admin/teachers");
  const [teachers, query] = await Promise.all([listTeacherAccounts(), searchParams]);
  const today = toStudyDay(new Date());
  // After Duyệt, Từ chối, Tạm dừng or Mở lại the row moves to its new group, so the result is
  // named here, in view, instead of beside the moved row.
  const changed = teachers.find((teacher) => teacher.userId === query.changed);
  const notice =
    changed && isOutcome(query.outcome)
      ? describeTeacherStatusOutcome(query.outcome, changed.fullName || changed.email)
      : null;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Giáo viên</h1>
          <p>
            <Link href="/admin">Quản trị</Link> · Duyệt hoặc từ chối yêu cầu, tạm dừng khi hết hạn
            thuê và ghi chú thanh toán.
          </p>
        </div>
      </div>
      {notice && (
        <p className="notice-panel" role="status">
          {notice}
        </p>
      )}
      <h2 className="visually-hidden">Danh sách giáo viên</h2>
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
                      {teacherStatusLabel(teacher.status, teacher.activatedAt)}
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
                    wasActivated={teacher.activatedAt !== null}
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
