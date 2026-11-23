import Link from "next/link";

import { OpenExamForm } from "@/components/exams/open-exam-form";
import { buttonVariants } from "@/components/ui/button";
import { examTitleFor } from "@/lib/exam-library";
import { describeJlptOutcome } from "@/lib/jlpt-history";
import { requireAccount } from "@/lib/server/account";
import { loadExamCenter } from "@/lib/server/exam-center";
import { formatStudyDateTime } from "@/lib/study-days";

import type { ExamRow, LibraryEntry } from "@/lib/server/exam-center";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Luyện đề JLPT" };
export const dynamic = "force-dynamic";

interface ExamsPageProps {
  searchParams: Promise<{ opened?: string; error?: string }>;
}

const ERRORS: Record<string, string> = {
  already_open: "Đề này đã mở cho lớp rồi; làm ở danh sách đề bên dưới.",
  no_exam_questions: "Bài này không còn ghép được đề. Tải lại trang để xem thư viện mới nhất.",
  not_found: "Chỉ chủ lớp mở được đề.",
  not_japanese: "Thi thử JLPT chỉ dành cho lớp tiếng Nhật.",
  invalid_items: "Database của Reng cần cập nhật trước khi mở đề có hơn 70 câu.",
  failed: "Chưa mở được đề. Thử lại sau ít phút.",
};

const SOURCE_LABELS: Record<ExamRow["source"], string> = {
  official: "Đề chính thức",
  reng: "Đề Reng",
  other: "Đề thi thử",
};

function ExamStatusCell({ exam, classId }: { exam: ExamRow; classId: string }) {
  const status = exam.status;
  if (!status) {
    return (
      <Link href={`/teach/classes/${classId}`} className="exam-action">
        Xem bài nộp của lớp
      </Link>
    );
  }
  if (status.kind === "submitted") {
    if (!status.result) {
      return <span className="exam-status">Đã nộp, chờ công bố điểm</span>;
    }
    const estimate = status.result.estimate;
    // The score leads; the outcome and its reasons follow in smaller text, the link stays whole.
    return (
      <div className="exam-outcome">
        <p>
          {estimate && <strong className="exam-score">{estimate.total}/180</strong>}
          <span className="exam-status">{describeJlptOutcome(estimate)}</span>
        </p>
        <Link href={`/assignments/${exam.assignmentId}/results`} className="exam-action">
          Xem kết quả
        </Link>
      </div>
    );
  }
  if (status.kind === "closed") {
    return <span className="exam-status muted">Hết hạn bắt đầu thi</span>;
  }
  return (
    <Link
      href={`/assignments/${exam.assignmentId}`}
      className={buttonVariants({ variant: status.kind === "in-progress" ? "default" : "outline" })}
    >
      {status.kind === "in-progress" ? "Làm tiếp" : "Làm đề"}
    </Link>
  );
}

interface LibraryRowProps {
  entry: LibraryEntry;
  classId: string;
}

function describeLibraryEntry({ source, opened }: LibraryEntry) {
  if (source.kind === "official") {
    return `Từ sách đề chính thức trên jlpt.jp. ${opened ? "Đã mở cho lớp." : "Đủ mọi câu theo sách, chưa mở."}`;
  }
  if (source.kind === "fixed") {
    return `Đề cố định ${source.questionCount} câu từ “${source.lessonTitle}”. ${opened ? "Đã mở cho lớp." : "Chưa mở."}`;
  }
  const origin = `Ghép từ “${source.lessonTitle}”.`;
  if (source.remainingExams > 0) {
    return `${origin} ${opened ? `Đã mở ${opened} đề` : "Chưa mở đề nào"}. Ngân hàng còn đủ ${source.remainingExams} đề không trùng câu với các đề trước.`;
  }
  return `${origin} Đã mở ${opened} đề và dùng hết câu chưa ra; đề mới sẽ lặp câu cũ ít ra nhất.`;
}

function LibraryRow({ entry, classId }: LibraryRowProps) {
  const { source, opened } = entry;
  const isOpenOnce = source.kind !== "bank";
  return (
    <li className="exam-library-row">
      <div>
        <p className="exam-title">{examTitleFor(source, opened)}</p>
        <p className="small muted">{describeLibraryEntry(entry)}</p>
      </div>
      <div className="exam-library-actions">
        {!(isOpenOnce && opened) && (
          <OpenExamForm
            classId={classId}
            lessonId={source.lessonId}
            examSetId={source.kind === "fixed" ? source.setId : undefined}
          />
        )}
      </div>
    </li>
  );
}

function libraryKey({ source }: LibraryEntry) {
  return source.kind === "fixed" ? `${source.lessonId}:${source.setId}` : source.lessonId;
}

export default async function ExamsPage({ searchParams }: ExamsPageProps) {
  const account = await requireAccount("/exams");
  const { opened, error } = await searchParams;
  const classes = await loadExamCenter(account.id, account.role === "teacher", new Date());
  // The "opened" notice sits in the class that received the exam, where the page scrolls to;
  // at the top of a long page it would be out of sight.
  const openedClassId = opened
    ? classes.find((item) => item.exams.some((exam) => exam.assignmentId === opened))?.classId
    : undefined;
  const openedNotice = (
    <p className="notice-panel" role="status">
      Đã mở đề mới. Bấm Làm đề khi sẵn sàng: đồng hồ chỉ chạy từ lúc bấm Bắt đầu thi.
    </p>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Luyện đề JLPT</h1>
          <p>
            Đề chính thức các năm trên jlpt.jp và đề Reng ghép đúng cấu trúc đề thật (N4 85 câu, N5
            67 câu). Mỗi đề làm một lượt, có giờ như đề thật, chấm điểm ước tính trên 180.
          </p>
        </div>
      </div>
      {opened && !openedClassId && openedNotice}
      {error && (
        <p className="notice-panel" role="alert">
          {ERRORS[error] ?? ERRORS.failed}
        </p>
      )}
      {!classes.length && (
        <p className="notice-panel">
          Chưa có đề nào. Đề hiện ở đây khi giáo viên mở đề cho lớp của bạn. Với lớp tự học hoặc lớp
          bạn dạy, thêm ngân hàng ôn hoặc đề chính thức JLPT vào lớp thì thư viện đề sẽ hiện ở đây.
        </p>
      )}
      {classes.map((item) => (
        <section
          key={item.classId}
          className="exam-class"
          aria-labelledby={`exams-${item.classId}`}
        >
          <h2 id={`exams-${item.classId}`}>
            {item.className}
            {item.isSelfStudy && (
              <>
                {" "}
                <span className="exam-class-note">(lớp tự học)</span>
              </>
            )}
            {!item.isLearner && (
              <>
                {" "}
                <span className="exam-class-note">(lớp bạn dạy)</span>
              </>
            )}
          </h2>
          {item.classId === openedClassId && openedNotice}
          {item.exams.length > 0 ? (
            <table className="exam-table">
              <caption className="visually-hidden">Đề đã mở của lớp {item.className}</caption>
              <thead>
                <tr>
                  <th scope="col">Đề</th>
                  <th scope="col">Loại</th>
                  <th scope="col">Thời gian</th>
                  <th scope="col">Hạn bắt đầu</th>
                  <th scope="col">{item.isLearner ? "Kết quả" : "Bài nộp"}</th>
                </tr>
              </thead>
              <tbody>
                {item.exams.map((exam) => (
                  <tr
                    key={exam.assignmentId}
                    id={`exam-${exam.assignmentId}`}
                    className={exam.assignmentId === opened ? "exam-row-new" : undefined}
                  >
                    <th scope="row" className="exam-title">
                      {exam.title}
                    </th>
                    <td className="exam-meta">
                      {SOURCE_LABELS[exam.source]} {exam.level}
                    </td>
                    <td className="exam-meta">{exam.minutes} phút</td>
                    <td className="exam-meta">
                      {exam.dueAt ? (
                        <>
                          {/* The phone layout drops the header row, so the date names itself. */}
                          <span className="exam-due-label">Hạn bắt đầu </span>
                          <span className="exam-date">{formatStudyDateTime(exam.dueAt)}</span>
                        </>
                      ) : (
                        "Không hạn"
                      )}
                    </td>
                    <td className="exam-result">
                      <ExamStatusCell exam={exam} classId={item.classId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Lớp chưa mở đề nào.</p>
          )}
          {item.isOwner && item.library.length > 0 && (
            <>
              <h3>Thư viện đề của lớp</h3>
              <ul className="exam-library">
                {item.library.map((entry) => (
                  <LibraryRow key={libraryKey(entry)} entry={entry} classId={item.classId} />
                ))}
              </ul>
            </>
          )}
        </section>
      ))}
    </>
  );
}
