import Link from "next/link";

import { LEARNER_LABELS } from "@/lib/class-report";
import { formatDecimal, formatPercent } from "@/lib/grading/grade";
import { formatStudyDay } from "@/lib/study-days";

import type { LearnerLabel, MemberReport } from "@/lib/class-report";

const LABEL_TONES: Record<LearnerLabel, string> = {
  abandoned: "status-wrong",
  failing: "status-wrong",
  weak_listening: "status-attention",
  passing: "status-correct",
  no_data: "status-neutral",
};

interface ClassStudentTableProps {
  classId: string;
  reports: readonly MemberReport[];
  formerMemberCount: number;
}

/** One row per current learner: submissions, average score, listens, last study day, label. */
export function ClassStudentTable({ classId, reports, formerMemberCount }: ClassStudentTableProps) {
  return (
    <>
      {reports.length ? (
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Học viên</th>
              <th scope="col" className="numeric">
                Đã nộp
              </th>
              <th scope="col" className="numeric">
                Điểm TB
              </th>
              <th scope="col" className="numeric">
                Nghe lại TB
              </th>
              <th scope="col">Học gần nhất</th>
              <th scope="col">Nhãn</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((row) => (
              <tr key={row.member.userId}>
                <td>
                  <Link href={`/teach/classes/${classId}/students/${row.member.userId}`}>
                    {row.member.fullName || row.member.email}
                  </Link>
                </td>
                <td className="numeric" data-label="Đã nộp">
                  {row.submittedCount}/{row.assignedCount}
                </td>
                <td className="numeric" data-label="Điểm TB">
                  {row.averagePercent === null ? "—" : formatPercent(row.averagePercent)}
                </td>
                <td className="numeric" data-label="Nghe lại TB">
                  {row.averageListens === null ? "—" : formatDecimal(row.averageListens)}
                </td>
                <td data-label="Học gần nhất">
                  {row.lastStudyDay ? formatStudyDay(row.lastStudyDay) : "—"}
                </td>
                <td>
                  <span className={`status-badge ${LABEL_TONES[row.label]}`}>
                    {LEARNER_LABELS[row.label]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Chưa có học viên. Gửi link mời hoặc mã lớp ở đầu trang để học viên tự vào lớp.</p>
      )}
      {formerMemberCount > 0 && (
        <p className="small muted">{formerMemberCount} học viên đã rời lớp không hiện ở đây.</p>
      )}
    </>
  );
}
