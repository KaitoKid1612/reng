// How a class stands against a lesson's current published version.
export type ClassLessonState = "latest" | "older" | "missing";

export function classLessonState(
  usedVersionNo: number | null,
  publishedVersionNo: number,
): ClassLessonState {
  if (usedVersionNo === null) {
    return "missing";
  }
  return usedVersionNo >= publishedVersionNo ? "latest" : "older";
}

export interface TeachingProgress {
  classCount: number;
  lessonCount: number;
  publishedLessonCount: number;
  hasClassLesson: boolean;
  hasLearner: boolean;
  hasSchedule: boolean;
  hasAssignment: boolean;
}

export interface StartStepLinks {
  newClass: string;
  newLesson: string;
  lesson: string;
  classContent: string;
  invite: string;
  schedule: string;
  assign: string;
}

export interface StartStep {
  label: string;
  hint: string;
  href: string;
  isDone: boolean;
}

// The order a new teacher goes through, each step with where to do it. Self-study classes do not
// count: they never take learners.
export function buildStartSteps(progress: TeachingProgress, links: StartStepLinks): StartStep[] {
  return [
    {
      label: "Tạo lớp học",
      hint: "đặt tên lớp, môn học, link Google Meet",
      href: links.newClass,
      isDone: progress.classCount > 0,
    },
    {
      label: "Tạo bài học",
      hint: "từ bài mẫu hoặc tự soạn",
      href: links.newLesson,
      isDone: progress.lessonCount > 0,
    },
    {
      label: "Xuất bản bài",
      hint: "bấm Xuất bản trong trình soạn",
      href: links.lesson,
      isDone: progress.publishedLessonCount > 0,
    },
    {
      label: "Đưa bài vào lớp",
      hint: "ở mục Dùng bài trong lớp của trình soạn",
      href: links.classContent,
      isDone: progress.hasClassLesson,
    },
    {
      label: "Mời học viên",
      hint: "gửi link mời hoặc mã lớp",
      href: links.invite,
      isDone: progress.hasLearner,
    },
    {
      label: "Đặt lịch học",
      hint: "học viên thấy buổi tới",
      href: links.schedule,
      isDone: progress.hasSchedule,
    },
    {
      label: "Giao bài tập",
      hint: "luyện tập hoặc kiểm tra, tự chấm",
      href: links.assign,
      isDone: progress.hasAssignment,
    },
  ];
}

// The steps are for getting started: a teacher whose class already has learners and assignments
// is past that, even without every optional step (a timetable, for one).
export function showsStartSteps(progress: TeachingProgress, steps: readonly StartStep[]) {
  const isTeaching = progress.hasLearner && progress.hasAssignment;
  return !isTeaching && steps.some((step) => !step.isDone);
}
