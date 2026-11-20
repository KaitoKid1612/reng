import Link from "next/link";

import type { Stage } from "@/lib/course-map";
import type { ClassLesson } from "@/lib/server/classes";

type MapLesson = ClassLesson & { hasListening?: boolean };

interface CourseMapProps {
  classId: string;
  isJapanese: boolean;
  stages: readonly Stage[];
  lessons: readonly MapLesson[];
}

const STATUS_LABELS: Record<Stage["status"], string> = {
  done: "Đã học",
  next: "Học tiếp",
  open: "Đã mở",
  locked: "Sắp mở",
};

// A tick when done, a lock before it opens, otherwise the lesson's number.
function stageMark(stage: Stage) {
  if (stage.status === "done") {
    return "✓";
  }
  return stage.status === "locked" ? "🔒" : stage.lessonOrder;
}

function StageStars({ stage }: { stage: Stage }) {
  if (stage.status === "locked") {
    return null;
  }
  if (!stage.answered) {
    return <span className="course-stage-stars muted">Chưa luyện</span>;
  }
  return (
    <span
      className="course-stage-stars"
      aria-label={`${stage.stars}/3 sao độ thuộc bài, ${stage.answered} câu đã làm trong 30 ngày`}
      title={`${stage.answered} câu đã làm trong 30 ngày`}
    >
      {"★".repeat(stage.stars)}
      <span className="course-stage-stars-empty">{"★".repeat(3 - stage.stars)}</span>
    </span>
  );
}

/**
 * The class's teaching lessons as a path of numbered stages: done, next, open or not yet open,
 * each with stars for how well the learner answers its questions lately.
 */
export function CourseMap({ classId, isJapanese, stages, lessons }: CourseMapProps) {
  const byId = new Map(lessons.map((lesson) => [lesson.lessonId, lesson]));
  const done = stages.filter((stage) => stage.status === "done").length;
  const percent = stages.length ? Math.round((done / stages.length) * 100) : 0;
  return (
    <div className="course-map">
      <div className="course-map-summary">
        <p>
          Đã học <strong>{done}</strong>/{stages.length} bài
        </p>
        <div
          className="course-map-bar"
          role="progressbar"
          aria-label="Tiến độ khóa học"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="small muted">
          Sao cho biết bạn làm đúng câu của bài đến đâu trong 30 ngày qua: ★★★ khi đúng từ 90% và
          làm ít nhất 10 câu.
        </p>
      </div>
      <ol className="course-stages">
        {stages.map((stage) => {
          const lesson = byId.get(stage.lessonId);
          if (!lesson) {
            return null;
          }
          const isLocked = stage.status === "locked";
          const query = `version=${lesson.versionId}`;
          return (
            <li key={stage.lessonId} className="course-stage" data-status={stage.status}>
              <span className="course-stage-node" aria-hidden="true">
                {stageMark(stage)}
              </span>
              <div className="course-stage-body">
                <h3>{lesson.title}</h3>
                <p className="item-meta">
                  <span className="course-stage-status">{STATUS_LABELS[stage.status]}</span>
                  <StageStars stage={stage} />
                </p>
                {!isLocked && (
                  <p className="course-stage-links">
                    <Link href={`/lessons/${lesson.lessonId}?${query}&class=${classId}`}>
                      Đọc bài
                    </Link>
                    {lesson.hasListening && (
                      <Link href={`/listening/${lesson.lessonId}?${query}`}>Luyện nghe</Link>
                    )}
                    {lesson.hasVocab && (
                      <>
                        <Link href={`/vocabulary/${lesson.lessonId}?${query}`}>Flashcard</Link>
                        <Link href={`/kanji/${lesson.lessonId}?${query}`}>
                          {isJapanese ? "Luyện kanji" : "Luyện chữ Hán"}
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
