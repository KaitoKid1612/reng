import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { slidePresenterPath } from "@/lib/class-sessions";
import { formatStudyDay } from "@/lib/study-days";

import type { ClassSession } from "@/lib/server/class-sessions";

interface TeachingPanelProps {
  classId: string;
  meetingUrl: string | null;
  latestSession: ClassSession | undefined;
}

// What a teacher needs when an online lesson starts sits above the reports: the Meet link and
// the slides of the class's own version, reopened where the last session stopped. Before any
// session is logged the teacher picks the lesson, since a class also holds question banks.
export function TeachingPanel({ classId, meetingUrl, latestSession }: TeachingPanelProps) {
  const sessionLesson = latestSession?.lesson;
  const resumeSlide = latestSession?.slideReached ?? 1;
  return (
    <section className="teaching-panel" aria-labelledby="teaching-panel-title">
      <h2 id="teaching-panel-title">Buổi dạy online</h2>
      {latestSession ? (
        <p className="small">
          Buổi gần nhất {formatStudyDay(latestSession.taughtOn)}
          {sessionLesson ? `: ${sessionLesson.title}` : ""}
          {latestSession.slideReached ? `, đến slide ${latestSession.slideReached}` : ""}
        </p>
      ) : (
        <p className="small muted">
          Sau mỗi buổi, ghi bài và slide đã dạy tới để lần sau mở lại đúng chỗ.
        </p>
      )}
      <div className="button-row">
        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants()}
          >
            Mở Google Meet
          </a>
        ) : (
          <Link href="#class-settings" className={buttonVariants({ variant: "outline" })}>
            Thêm link Google Meet
          </Link>
        )}
        {sessionLesson ? (
          <Link
            href={slidePresenterPath(
              sessionLesson.id,
              sessionLesson.versionId,
              resumeSlide,
              classId,
            )}
            className={buttonVariants({ variant: meetingUrl ? "outline" : "default" })}
          >
            {resumeSlide > 1
              ? `Trình chiếu tiếp từ slide ${resumeSlide}`
              : `Trình chiếu «${sessionLesson.title}»`}
          </Link>
        ) : (
          <Link href="#class-content" className={buttonVariants({ variant: "outline" })}>
            Chọn bài để trình chiếu
          </Link>
        )}
        <Link href="#class-sessions">Ghi buổi dạy</Link>
      </div>
      <p className="small muted">
        Trong Meet, chia sẻ tab trình chiếu; bấm Presenter (phím S) để mở cửa sổ ghi chú riêng mà
        học viên không thấy. Hết buổi, bấm Ghi buổi dạy trên thanh trình chiếu.
      </p>
    </section>
  );
}
