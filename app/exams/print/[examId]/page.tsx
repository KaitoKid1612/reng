import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AnswerKey,
  AnswerSheet,
  ListeningScript,
  QuestionBooklet,
} from "@/components/exams/exam-print-booklets";
import { PrintButton } from "@/components/exams/print-button";
import {
  buildAnswerKey,
  buildAnswerSheet,
  buildListeningScript,
  buildQuestionBooklet,
  canPrintJlptExams,
  describeExamTime,
  LEARNER_BOOKLETS,
  parsePrintBooklet,
  PRINT_BOOKLET_LABELS,
  PRINT_BOOKLETS,
  RENG_EXAM_NOTICE,
} from "@/lib/exam-print";
import { findJlptExamSet } from "@/lib/jlpt-exam-sets";
import { JLPT_OFFICIAL_CREDIT } from "@/lib/jlpt-official";
import { lessonAudioUrl } from "@/lib/lesson-audio-url";
import { requireAccount } from "@/lib/server/account";
import { listTeacherClasses } from "@/lib/server/classes";
import { loadPrintableExam } from "@/lib/server/exam-print";
import { absoluteUrl } from "@/lib/site";

import type { PrintBooklet } from "@/lib/exam-print";
import type { JlptExamSet } from "@/lib/jlpt-exam-sets";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface ExamPrintPageProps {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ booklet?: string }>;
}

export async function generateMetadata({ params }: ExamPrintPageProps): Promise<Metadata> {
  // An exam a class opened is named on the page itself; its title needs a database read.
  const set = findJlptExamSet((await params).examId);
  return { title: set ? `Bản in: ${set.title}` : "Bản in đề JLPT" };
}

// A printed QR code has to work from any phone, so the audio link is absolute.
function audioUrl(hash: string) {
  return absoluteUrl(lessonAudioUrl(hash) ?? "");
}

interface BookletBodyProps {
  set: JlptExamSet;
  booklet: PrintBooklet;
  runningTitle: string;
}

function BookletBody({ set, booklet, runningTitle }: BookletBodyProps) {
  if (booklet === "answer-sheet") {
    return <AnswerSheet sections={buildAnswerSheet(set)} runningTitle={runningTitle} />;
  }
  if (booklet === "answers") {
    return <AnswerKey sections={buildAnswerKey(set)} runningTitle={runningTitle} />;
  }
  if (booklet === "script") {
    return (
      <ListeningScript
        sections={buildListeningScript(set)}
        runningTitle={runningTitle}
        audioUrl={audioUrl}
      />
    );
  }
  return (
    <QuestionBooklet
      sections={buildQuestionBooklet(set)}
      runningTitle={runningTitle}
      audioUrl={audioUrl}
    />
  );
}

export default async function ExamPrintPage({ params, searchParams }: ExamPrintPageProps) {
  const { examId } = await params;
  const booklet = parsePrintBooklet((await searchParams).booklet);
  // Signing in returns to the same booklet, not to the question booklet.
  const path = `/exams/print/${encodeURIComponent(examId)}`;
  const account = await requireAccount(
    booklet === "questions" ? path : `${path}?booklet=${booklet}`,
  );
  const ownedClasses = account.role === "teacher" ? await listTeacherClasses(account.id) : [];
  const set = await loadPrintableExam(examId, new Set(ownedClasses.map((item) => item.id)));
  if (!set) {
    notFound();
  }
  if (!canPrintJlptExams(account.role, ownedClasses)) {
    return (
      <>
        <h1>Bản in đề JLPT</h1>
        <p className="notice-panel" role="alert">
          Chỉ giáo viên và chủ lớp tiếng Nhật mở được bản in đề, vì bản in có đáp án. Học viên làm
          đề ở trang <Link href="/exams">Luyện đề</Link>.
        </p>
      </>
    );
  }
  // The paper names the exam by its title alone: "Đề 3" (its place in the list on the exam page)
  // beside "Đề thi thử Reng N5 số 1" would read as two numbers for one exam.
  const runningTitle = set.title;
  const isForLearner = LEARNER_BOOKLETS.has(booklet);
  return (
    <div className="exam-print">
      <nav className="exam-print-toolbar" aria-label="Bản in">
        <Link href="/exams#exam-print-sets">← Luyện đề</Link>
        <ul className="exam-print-tabs">
          {PRINT_BOOKLETS.map((item) => (
            <li key={item}>
              <Link
                href={`/exams/print/${encodeURIComponent(set.id)}?booklet=${item}`}
                aria-current={item === booklet ? "page" : undefined}
              >
                {PRINT_BOOKLET_LABELS[item]}
              </Link>
            </li>
          ))}
        </ul>
        <PrintButton />
        <p className="small muted">
          Trong hộp thoại in: khổ A4, hướng dọc, lề mặc định; chọn “Lưu dưới dạng PDF” để lưu file.
          {isForLearner ? "" : " Tập này có đáp án: chỉ dành cho giáo viên."}
        </p>
      </nav>
      <header className="exam-print-cover">
        <p className="exam-print-level" lang="ja">
          日本語能力試験 {set.level}
        </p>
        <h1>{set.title}</h1>
        <p className="exam-print-booklet-name">{PRINT_BOOKLET_LABELS[booklet]}</p>
        <p>Thời gian {describeExamTime(set)}</p>
        {set.kind === "official" && (
          <p className="exam-print-credit" lang="ja">
            {JLPT_OFFICIAL_CREDIT}
            {!isForLearner && <span lang="vi"> Lời giải thích tiếng Việt do Reng biên soạn.</span>}
          </p>
        )}
        {set.kind === "reng" && <p className="exam-print-credit">{RENG_EXAM_NOTICE}</p>}
        {isForLearner && (
          <p className="exam-print-name">
            Họ tên: <span className="exam-print-blank" /> Ngày:{" "}
            <span className="exam-print-blank" />
          </p>
        )}
      </header>
      <BookletBody set={set} booklet={booklet} runningTitle={runningTitle} />
    </div>
  );
}
