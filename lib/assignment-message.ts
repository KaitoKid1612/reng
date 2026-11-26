import { formatStudyDateTime } from "@/lib/study-days";

import type { AssignmentMode } from "@/lib/assignment";

export interface AssignmentMessageInput {
  className: string;
  title: string;
  mode: AssignmentMode;
  dueAt: string | null;
  allowLate: boolean;
  url: string;
  // A JLPT mock exam: named as such, with its time per attempt.
  exam?: { level: string; timeLimitMinutes: number } | null;
}

const MODE_WORDS: Record<AssignmentMode, string> = {
  practice: "luyện tập",
  test: "kiểm tra",
};

function describeDeadline(dueAt: string | null, allowLate: boolean) {
  if (!dueAt) {
    return "Không có hạn nộp.";
  }
  const due = formatStudyDateTime(dueAt);
  return allowLate
    ? `Hạn nộp: ${due} (nộp muộn vẫn được).`
    : `Hạn nộp: ${due}, quá hạn không nộp được nữa.`;
}

/**
 * The message a teacher pastes into the class chat (Zalo, Messenger) after giving work: classes in
 * Vietnam mostly hear about homework there, so it names the class, the work, the deadline in
 * Vietnam time and the link. Plain text, because chat apps keep line breaks but not formatting.
 */
export function buildAssignmentMessage(input: AssignmentMessageInput) {
  // "Lớp A" and "Tiếng Nhật – Lớp 1" already say they are a class; "Minna sơ cấp" does not.
  const classLabel = /(^|\s)lớp(\s|$)/iu.test(input.className.trim())
    ? input.className.trim()
    : `Lớp ${input.className.trim()}`;
  if (input.exam) {
    return [
      `${classLabel}: có đề thi thử JLPT ${input.exam.level} mới «${input.title}», làm trong ${input.exam.timeLimitMinutes} phút từ lúc bấm Bắt đầu thi.`,
      // The page hands an attempt in at the closing time, so a late start leaves little time.
      input.dueAt
        ? `Đề đóng lúc ${formatStudyDateTime(input.dueAt)}; bài đang làm sẽ tự nộp lúc đó, nên bắt đầu sớm để đủ ${input.exam.timeLimitMinutes} phút.`
        : "Đề không có giờ đóng.",
      `Làm bài tại: ${input.url}`,
    ].join("\n");
  }
  return [
    `${classLabel}: có bài ${MODE_WORDS[input.mode]} mới «${input.title}».`,
    describeDeadline(input.dueAt, input.allowLate),
    `Làm bài tại: ${input.url}`,
  ].join("\n");
}
