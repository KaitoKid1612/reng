import Link from "next/link";

import { ExamPrintList } from "@/components/exams/exam-print-list";
import { OpenExamForm } from "@/components/exams/open-exam-form";
import { buttonVariants } from "@/components/ui/button";
import { examTitleFor, nextExamPrintId } from "@/lib/exam-library";
import { canPrintJlptExams } from "@/lib/exam-print";
import { describeJlptOutcome } from "@/lib/jlpt-history";
import { findJlptExamSet } from "@/lib/jlpt-exam-sets";
import { requireAccount } from "@/lib/server/account";
import { listTeacherClasses } from "@/lib/server/classes";
import { loadExamCenter } from "@/lib/server/exam-center";
import { formatStudyDateTime } from "@/lib/study-days";

import type { ExamSource } from "@/lib/exam-library";
import type { ExamRow, LibraryEntry } from "@/lib/server/exam-center";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Luyện đề JLPT" };
export const dynamic = "force-dynamic";

interface ExamsPageProps {
  searchParams: Promise<{ opened?: string; error?: string }>;
}

const ERRORS: Record<string, string> = {
  already_open: "Đề này đã mở cho lớp.",
  no_exam_questions: "Bài này không còn ghép được đề. Tải lại trang.",
  not_found: "Chỉ giáo viên của lớp mở được đề.",
  not_japanese: "Chỉ lớp tiếng Nhật có thi thử JLPT.",
  invalid_items: "Bài nguồn vừa thay đổi. Tải lại trang rồi mở đề lại.",
  failed: "Chưa mở được đề. Thử lại sau ít phút.",
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
    return <span className="exam-status muted">Đề đã đóng</span>;
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
  isSelfStudy: boolean;
  canPrint: boolean;
}

// What a library row prints: a printable set (a fixed Reng exam, a workbook or supplied test), or
// else the exam the class would open next from the lesson, as "Mở đề này" composes it.
function printIdOf(source: ExamSource, classId: string) {
  if (source.kind === "fixed") {
    return source.setId;
  }
  return source.kind === "official" && source.setId && findJlptExamSet(source.setId)
    ? source.setId
    : nextExamPrintId(classId, source.lessonId);
}

function LibraryRow({ entry, classId, isSelfStudy, canPrint }: LibraryRowProps) {
  const { source, opened } = entry;
  const isOpenOnce = source.kind !== "bank";
  const printId = canPrint ? printIdOf(source, classId) : null;
  return (
    <li className="exam-library-row">
      <div>
        <p className="exam-title">{examTitleFor(source, opened)}</p>
        {entry.isSourceOpen && !isSelfStudy && (
          <p className="small">Bài nguồn đang mở: học viên xem được câu và đáp án trong lúc thi.</p>
        )}
      </div>
      <div className="exam-library-actions">
        {printId && <Link href={`/exams/print/${encodeURIComponent(printId)}`}>Bản in</Link>}
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
  const isTeacher = account.role === "teacher";
  const [classes, ownedClasses] = await Promise.all([
    loadExamCenter(account.id, isTeacher, new Date()),
    isTeacher ? listTeacherClasses(account.id) : Promise.resolve([]),
  ]);
  const canPrint = canPrintJlptExams(account.role, ownedClasses);
  // The "opened" notice sits in the class that received the exam, where the page scrolls to;
  // at the top of a long page it would be out of sight.
  const openedClassId = opened
    ? classes.find((item) => item.exams.some((exam) => exam.assignmentId === opened))?.classId
    : undefined;
  const openedNotice = (forLearner: boolean) => (
    <p className="notice-panel" role="status">
      {forLearner ? "Đã mở đề mới." : "Đã mở đề cho lớp."}
    </p>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Luyện đề JLPT</h1>
        </div>
      </div>
      {opened && !openedClassId && openedNotice(!isTeacher)}
      {error && (
        <p className="notice-panel" role="alert">
          {ERRORS[error] ?? ERRORS.failed}
        </p>
      )}
      {!classes.length && <p className="notice-panel">Chưa có đề nào.</p>}
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
          {item.classId === openedClassId && openedNotice(item.isLearner)}
          {item.exams.length > 0 ? (
            <table className="exam-table">
              <caption className="visually-hidden">Đề đã mở của lớp {item.className}</caption>
              <thead>
                <tr>
                  <th scope="col">Đề</th>
                  <th scope="col">Thời gian</th>
                  <th scope="col">Đóng lúc</th>
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
                      {/* The owner prints the very questions this exam gave the class. */}
                      {canPrint && item.isOwner && (
                        <>
                          {" "}
                          <Link
                            href={`/exams/print/${exam.assignmentId}`}
                            className="exam-row-print"
                          >
                            Bản in
                          </Link>
                        </>
                      )}
                    </th>
                    <td className="exam-meta">{exam.minutes} phút</td>
                    <td className="exam-meta">
                      {exam.dueAt ? (
                        <>
                          {/* The phone layout drops the header row, so the date names itself. */}
                          <span className="exam-due-label">Đóng lúc </span>
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
                  <LibraryRow
                    key={libraryKey(entry)}
                    entry={entry}
                    classId={item.classId}
                    isSelfStudy={item.isSelfStudy}
                    canPrint={canPrint}
                  />
                ))}
              </ul>
            </>
          )}
        </section>
      ))}
      {canPrint && <ExamPrintList />}
    </>
  );
}
