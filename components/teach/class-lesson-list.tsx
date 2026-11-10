import Link from "next/link";

import { RemoveClassLessonButton } from "@/components/teach/remove-class-lesson-button";
import { slidePresenterPath } from "@/lib/class-sessions";
import { formatStudyDateTime } from "@/lib/study-days";

import type { ClassReportLesson } from "@/lib/server/reports";

interface ClassLessonListProps {
  classId: string;
  lessons: readonly ClassReportLesson[];
}

/** The lessons in the class, in class order, each at the version the class uses. */
export function ClassLessonList({ classId, lessons }: ClassLessonListProps) {
  if (!lessons.length) {
    return (
      <p className="muted">
        Chưa có bài học nào trong lớp; học viên chỉ thấy bài sau khi bạn thêm bài vào lớp.
      </p>
    );
  }
  return (
    <ul className="item-list">
      {lessons.map((lesson) => (
        <li key={lesson.lessonId}>
          <div>
            <span>
              {lesson.orderNo}. {lesson.title} (phiên bản {lesson.versionNo})
            </span>
            <p className="item-meta">Mở từ {formatStudyDateTime(lesson.availableAt)}</p>
          </div>
          {/* The class's own version, which can differ from the newest published one. */}
          <div className="button-row">
            <Link href={slidePresenterPath(lesson.lessonId, lesson.versionId, 1, classId)}>
              Trình chiếu
            </Link>
            <Link href={`/lessons/${lesson.lessonId}?version=${lesson.versionId}`}>Đọc bài</Link>
            <RemoveClassLessonButton
              classId={classId}
              lessonId={lesson.lessonId}
              title={lesson.title}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
