import { cache } from "react";
import Link from "next/link";

import {
  describeAssignmentKind,
  describeDue,
  QUESTION_TYPE_LABELS,
} from "@/components/classroom/assignment-labels";
import { AssignmentFixTable } from "@/components/teach/assignment-fix-table";
import { answerLang, describeCorrectAnswer, toQuestionView } from "@/lib/assignment";
import { countUnreadUnits } from "@/lib/furigana-units";
import { getCurrentAccount, requireTeacher } from "@/lib/server/account";
import { getFixableAssignment } from "@/lib/server/assignment-fixes";
import { loadOrNotFound } from "@/lib/server/pages";

import type { FixRow } from "@/components/teach/assignment-fix-table";
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

function furiganaPlace(isJapanese: boolean, asksReading: boolean): FixRow["furigana"] {
  if (!isJapanese) {
    return "none";
  }
  return asksReading ? "after-answer" : "all";
}

function toFixRow(item: FixableQuestion): FixRow {
  const { question, fix } = item;
  const view = toQuestionView(question);
  // Furigana is for Japanese; a kanji reading question must not show the reading it asks for.
  const isJapanese = view.lang === "ja";
  const asksReading = question.tags.includes("kanji");
  const isChoice = question.type === "choice" || question.type === "listen";
  return {
    questionId: item.questionId,
    position: item.position,
    hash: item.hash,
    typeLabel: QUESTION_TYPE_LABELS[question.type],
    furigana: furiganaPlace(isJapanese, asksReading),
    lang: view.lang,
    answerLang: answerLang(view),
    answerText: describeCorrectAnswer(question),
    correctOptions: isChoice
      ? question.answer.filter((answer): answer is number => typeof answer === "number")
      : [],
    current: fix,
    edits: item.edits,
    unreadCount:
      isJapanese && !asksReading
        ? [fix.prompt, ...(fix.options ?? [])].reduce(
            (total, text) => total + countUnreadUnits(text),
            0,
          )
        : 0,
  };
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
        {describeAssignmentKind(assignment)}, {describeDue(assignment.dueAt)}, {questions.length}{" "}
        câu
        {editedCount ? `, đã sửa ${editedCount} câu` : ""}
        {assignment.status === "closed" ? ", đã đóng" : ""}
      </p>
      <p className="fix-intro">
        Bấm <strong>Sửa</strong> ở câu cần sửa: khung Trước là câu học viên đang thấy, khung Sau là
        bản sửa với ô cách đọc cho từng chữ Hán. Đáp án, lựa chọn và thứ tự câu giữ nguyên, nên bài
        làm và điểm của học viên không đổi; học viên mở lại bài là thấy nội dung mới.
      </p>
      <p className="small muted fix-intro">
        Câu được chép từ bài nguồn lúc giao. Để các bài giao sau không lặp lỗi, sửa cả trong{" "}
        <Link href={`/teach/lessons/${assignment.lessonId}/edit`}>bài nguồn</Link>.
      </p>
      <AssignmentFixTable assignmentId={assignment.id} rows={questions.map(toFixRow)} />
    </div>
  );
}
