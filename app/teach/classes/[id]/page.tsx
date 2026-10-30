import Link from "next/link";

import { describeDue, MODE_LABELS } from "@/components/classroom/assignment-labels";
import { ClassSettingsForm } from "@/components/teach/class-settings-form";
import { CloseAssignmentButton } from "@/components/teach/close-assignment-button";
import { DailyPracticeForm } from "@/components/teach/daily-practice-form";
import { JoinCodeControls } from "@/components/teach/join-code-controls";
import { buttonVariants } from "@/components/ui/button";
import { LEARNER_LABELS } from "@/lib/class-report";
import { formatPercent } from "@/lib/grading/grade";
import { requireTeacher } from "@/lib/server/account";
import { loadOrNotFound } from "@/lib/server/pages";
import { getClassReport } from "@/lib/server/reports";
import { absoluteUrl } from "@/lib/site";
import { formatStudyDateTime, formatStudyDay } from "@/lib/study-days";

import type { AssignmentResult, LearnerLabel } from "@/lib/class-report";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Theo dõi lớp" };

interface ClassReportPageProps {
  params: Promise<{ id: string }>;
}

const LABEL_TONES: Record<LearnerLabel, string> = {
  abandoned: "status-wrong",
  failing: "status-wrong",
  weak_listening: "status-attention",
  passing: "status-correct",
  no_data: "status-neutral",
};

interface AssignmentResultLineProps {
  result: AssignmentResult;
}

// Current members only, latest attempt each, so it can differ from the raw submission count.
function AssignmentResultLine({ result }: AssignmentResultLineProps) {
  const submitted = `${result.submittedCount}/${result.assignedCount} học viên đã nộp`;
  if (result.averagePercent === null) {
    return <p className="item-meta">Chưa có điểm · {submitted}</p>;
  }
  return (
    <div className="score-meter-row">
      <span className="score-meter" aria-hidden="true">
        <span style={{ width: `${result.averagePercent}%` }} />
      </span>
      <span className="item-meta">
        Điểm TB {formatPercent(result.averagePercent)} · {submitted}
      </span>
    </div>
  );
}

export default async function ClassReportPage({ params }: ClassReportPageProps) {
  const { id } = await params;
  const account = await requireTeacher(`/teach/classes/${id}`);
  const report = await loadOrNotFound(getClassReport(account.id, id, new Date()));
  const { classRow, summary, week } = report;
  const joinCodeControls = (
    <JoinCodeControls
      classId={classRow.id}
      joinCode={classRow.join_code}
      isEnabled={classRow.join_enabled}
      inviteUrl={absoluteUrl(`/join-class?code=${classRow.join_code}`)}
    />
  );
  // A class without learners needs its code first; afterwards the report comes first.
  const hasLearners = report.reports.length > 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{classRow.name}</h1>
          <p>
            <Link href="/teach">Giảng dạy</Link>, điểm đạt của lớp {classRow.pass_score}%
            {classRow.active ? "" : ", lớp đã lưu trữ"}
          </p>
        </div>
        <div className="button-row">
          <Link href={`/teach/classes/${classRow.id}/assign`} className={buttonVariants()}>
            Giao bài
          </Link>
          <a
            href={`/api/teach/classes/${classRow.id}/report`}
            className={buttonVariants({ variant: "outline" })}
            download
          >
            Xuất CSV
          </a>
        </div>
      </div>
      {!hasLearners && joinCodeControls}
      <div className="stat-tiles">
        <div className="stat-tile">
          <strong>{week.percent === null ? "—" : formatPercent(week.percent)}</strong>
          <span>nộp bài tuần này</span>
          <span className="stat-tile-detail">
            {week.expectedCount
              ? `${week.submittedCount}/${week.expectedCount} bài đến hạn từ thứ Hai`
              : "Chưa có bài đến hạn tuần này"}
          </span>
          <span className="stat-tile-detail">Tổng {summary.submittedCount} bài đã nộp</span>
        </div>
        <div className="stat-tile">
          <strong>
            {summary.averagePercent === null ? "—" : formatPercent(summary.averagePercent)}
          </strong>
          <span>điểm trung bình</span>
        </div>
        <div className="stat-tile">
          <strong>{summary.passingCount}</strong>
          <span>học viên đạt</span>
        </div>
        <div className="stat-tile">
          <strong>{summary.attentionCount}</strong>
          <span>cần chú ý</span>
        </div>
      </div>
      <section className="section-block" aria-labelledby="students-title">
        <h2 id="students-title">Học viên</h2>
        {report.reports.length ? (
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
              {report.reports.map((row) => (
                <tr key={row.member.userId}>
                  <td>
                    <Link href={`/teach/classes/${classRow.id}/students/${row.member.userId}`}>
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
                    {row.averageListens === null ? "—" : row.averageListens.toFixed(1)}
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
        {report.formerMemberCount > 0 && (
          <p className="small muted">
            {report.formerMemberCount} học viên đã rời lớp không hiện ở đây.
          </p>
        )}
      </section>
      <section className="section-block" aria-labelledby="hard-questions">
        <h2 id="hard-questions">Câu cả lớp sai nhiều</h2>
        <p className="small muted">
          Từ 50% học viên trở lên sai, chỉ tính lượt nộp mới nhất của mỗi người. Đây là tín hiệu để
          xem lại cách giảng, không phải kết luận nguyên nhân.
        </p>
        {report.questionStats.length ? (
          report.questionStats.map((entry) => (
            <div key={entry.assignment.id} className="result-row" data-correct="false">
              <h3>{entry.assignment.title}</h3>
              <ul className="item-list">
                {entry.questions.map((question) => (
                  <li key={question.question_id}>
                    <span lang="ja">{question.prompt}</span>
                    <span className="item-meta">
                      {question.wrong_count}/{question.total_count} học viên sai
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="muted">Chưa có câu nào bị sai từ 50% trở lên.</p>
        )}
      </section>
      <section className="section-block" aria-labelledby="daily-practice-title">
        <h2 id="daily-practice-title">Bài luyện hằng ngày</h2>
        <p className="small muted">
          Mỗi sáng từ 6:00 (giờ Việt Nam) Reng tự giao một bài luyện tập từ bài học mới nhất đã mở
          có câu chọn/điền (bài mới chỉ có slide thì lấy bài trước đó): hạn 23:59 cùng ngày (nộp
          muộn vẫn được), tối đa 3 lượt, xem giải thích ngay sau khi nộp. Câu đổi mỗi ngày, ưu tiên
          câu chưa xuất hiện gần đây; câu sai vào sổ lỗi và lịch ôn tập của học viên.
        </p>
        <DailyPracticeForm classId={classRow.id} size={classRow.daily_practice_size} />
      </section>
      <section className="section-block" aria-labelledby="assignments-title">
        <h2 id="assignments-title">Bài đã giao</h2>
        {report.assignments.length ? (
          <ul className="item-list">
            {report.assignments.map((assignment) => (
              <li key={assignment.id}>
                <div>
                  <h3>{assignment.title}</h3>
                  <p className="item-meta">
                    {MODE_LABELS[assignment.mode]}, {describeDue(assignment.dueAt)},{" "}
                    {assignment.submittedCount} bài nộp, {assignment.openAttemptCount} đang làm
                    {assignment.status === "closed" ? ", đã đóng" : ""}
                  </p>
                  {assignment.result && assignment.result.assignedCount > 0 && (
                    <AssignmentResultLine result={assignment.result} />
                  )}
                </div>
                {assignment.status === "published" && (
                  <CloseAssignmentButton
                    assignmentId={assignment.id}
                    openAttemptCount={assignment.openAttemptCount}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Chưa có bài tập nào.{" "}
            <Link href={`/teach/classes/${classRow.id}/assign`}>Giao bài đầu tiên</Link>.
          </p>
        )}
      </section>
      <section className="section-block" aria-labelledby="class-content">
        <h2 id="class-content">Nội dung lớp</h2>
        <p className="small">
          <Link href={`/teach/classes/${classRow.id}/assign#class-content-title`}>
            Thêm bài hoặc đổi phiên bản, lịch mở
          </Link>
        </p>
        {report.lessons.length ? (
          <ul className="item-list">
            {report.lessons.map((lesson) => (
              <li key={lesson.lessonId}>
                <span>
                  {lesson.orderNo}. {lesson.title} (phiên bản {lesson.versionNo})
                </span>
                <span className="item-meta">Mở từ {formatStudyDateTime(lesson.availableAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Chưa có bài học nào trong lớp; học viên chỉ thấy bài sau khi bạn thêm bài vào lớp.
          </p>
        )}
      </section>
      {hasLearners && joinCodeControls}
      <section className="section-block" aria-labelledby="class-settings">
        <h2 id="class-settings">Cài đặt lớp</h2>
        <ClassSettingsForm classRow={classRow} />
      </section>
    </>
  );
}
