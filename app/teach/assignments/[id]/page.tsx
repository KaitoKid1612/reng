import { cache } from "react";
import Link from "next/link";

import {
  describeDue,
  MODE_LABELS,
  QUESTION_TYPE_LABELS,
} from "@/components/classroom/assignment-labels";
import { PassageDetails } from "@/components/classroom/passage-details";
import { FuriganaText } from "@/components/lessons/japanese-text";
import { QuestionFixForm } from "@/components/teach/question-fix-form";
import { answerLang, describeCorrectAnswer, toQuestionView } from "@/lib/assignment";
import { getCurrentAccount, requireTeacher } from "@/lib/server/account";
import { getFixableAssignment } from "@/lib/server/assignment-fixes";
import { loadOrNotFound } from "@/lib/server/pages";
import { formatStudyDateTime } from "@/lib/study-days";

import type { FixableQuestion } from "@/lib/server/assignment-fixes";
import type { Metadata } from "next";

interface AssignmentFixPageProps {
  params: Promise<{ id: string }>;
}

const loadAssignment = cache(getFixableAssignment);

export async function generateMetadata({ params }: AssignmentFixPageProps): Promise<Metadata> {
  const { id } = await params;
  const account = await getCurrentAccount();
  if (account?.role !== "teacher") {
    return { title: "Sửa lỗi hiển thị" };
  }
  try {
    return {
      title: `Sửa lỗi hiển thị: ${(await loadAssignment(account.id, id)).assignment.title}`,
    };
  } catch {
    return { title: "Sửa lỗi hiển thị" };
  }
}

function correctChoices(question: FixableQuestion["question"]) {
  return question.type === "choice" || question.type === "listen"
    ? question.answer.filter((answer): answer is number => typeof answer === "number")
    : [];
}

function choiceOptions(question: FixableQuestion["question"]) {
  return question.type === "choice" || question.type === "listen" ? (question.options ?? []) : [];
}

function QuestionCard({ assignmentId, item }: { assignmentId: string; item: FixableQuestion }) {
  const { question } = item;
  const view = toQuestionView(question);
  const { lang } = view;
  const lastEdit = item.edits.at(-1);
  return (
    <li id={`question-${item.questionId}`}>
      <div className="fix-question-view">
        <p className="item-meta">
          Câu {item.position} · {QUESTION_TYPE_LABELS[question.type]} · {question.points} điểm
        </p>
        <PassageDetails passage={question.passage} lang={lang} />
        <p lang={lang} className="question-prompt">
          <FuriganaText text={question.prompt} />
        </p>
        {choiceOptions(question).length > 0 && (
          <ol className="fix-options">
            {choiceOptions(question).map((option, index) => (
              <li key={index} lang={lang}>
                <FuriganaText text={option} />
              </li>
            ))}
          </ol>
        )}
        <p>
          Đáp án:{" "}
          <strong lang={answerLang(view)}>
            <FuriganaText text={describeCorrectAnswer(question)} />
          </strong>
        </p>
        <p className="muted">
          <FuriganaText text={question.explain} />
        </p>
        {lastEdit && (
          <details className="fix-history">
            <summary>
              Đã sửa {item.edits.length} lần, gần nhất {formatStudyDateTime(lastEdit.at)}
            </summary>
            <ol>
              {item.edits.map((edit, index) => (
                <li key={index}>
                  {formatStudyDateTime(edit.at)}: đề trước{" "}
                  <span lang={lang}>
                    «<FuriganaText text={edit.beforePrompt} />»
                  </span>
                  , sau{" "}
                  <span lang={lang}>
                    «<FuriganaText text={edit.afterPrompt} />»
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
      <div className="fix-question-edit">
        <QuestionFixForm
          assignmentId={assignmentId}
          questionId={item.questionId}
          hash={item.hash}
          position={item.position}
          fix={item.fix}
          lang={lang}
          correctOptions={correctChoices(question)}
        />
      </div>
    </li>
  );
}

export default async function AssignmentFixPage({ params }: AssignmentFixPageProps) {
  const { id } = await params;
  const account = await requireTeacher(`/teach/assignments/${id}`);
  const { assignment, className, questions } = await loadOrNotFound(loadAssignment(account.id, id));
  const editedCount = questions.filter((item) => item.edits.length).length;
  return (
    <div className="fix-page">
      <p className="muted">
        <Link href={`/teach/classes/${assignment.classId}`}>{className}</Link>
      </p>
      <h1>Sửa lỗi hiển thị: {assignment.title}</h1>
      <p className="item-meta">
        {MODE_LABELS[assignment.mode]}, {describeDue(assignment.dueAt)}, {questions.length} câu
        {editedCount ? `, đã sửa ${editedCount} câu` : ""}
        {assignment.status === "closed" ? ", đã đóng" : ""}
      </p>
      <p className="fix-intro">
        Đề bị sai hoặc khó đọc sau khi đã giao thì sửa ở đây: đề bài, giải thích và furigana. Đáp
        án, lựa chọn, điểm và thứ tự câu giữ nguyên, nên câu học viên đang làm và điểm đã nộp không
        đổi. Học viên mở lại bài sẽ thấy nội dung mới; mỗi lần sửa được lưu lại.
      </p>
      <p className="small muted fix-intro">
        Câu trong bài giao được chép từ bài nguồn lúc giao. Để các bài giao sau không lặp lỗi, sửa
        cả trong <Link href={`/teach/lessons/${assignment.lessonId}/edit`}>bài nguồn</Link> rồi xuất
        bản và cập nhật lớp lên phiên bản mới.
      </p>
      <nav className="fix-jump" aria-label="Đi tới câu">
        <span className="small muted">Đi tới câu:</span>
        {questions.map((item) => (
          <a
            key={item.questionId}
            href={`#question-${item.questionId}`}
            data-edited={item.edits.length > 0}
            aria-label={`Câu ${item.position}${item.edits.length ? ", đã sửa" : ""}`}
          >
            {item.position}
          </a>
        ))}
      </nav>
      <ol className="fix-question-list">
        {questions.map((item) => (
          <QuestionCard key={item.questionId} assignmentId={assignment.id} item={item} />
        ))}
      </ol>
    </div>
  );
}
