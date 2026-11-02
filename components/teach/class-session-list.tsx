import Link from "next/link";

import { DeleteSessionButton } from "@/components/teach/delete-session-button";
import { slidePresenterPath } from "@/lib/class-sessions";
import { formatStudyDay } from "@/lib/study-days";

import type { ClassSession } from "@/lib/server/class-sessions";

interface ClassSessionListProps {
  classId: string;
  sessions: ClassSession[];
}

function describeSession(session: ClassSession) {
  if (!session.lesson) {
    return "Không dùng bài trong lớp";
  }
  const lesson = `${session.lesson.title} (phiên bản ${session.lesson.versionNo})`;
  return session.slideReached ? `${lesson}, đến slide ${session.slideReached}` : lesson;
}

export function ClassSessionList({ classId, sessions }: ClassSessionListProps) {
  if (!sessions.length) {
    return (
      <p className="muted">
        Chưa ghi buổi dạy nào. Sau mỗi buổi, ghi bài và slide đã dạy tới để buổi sau mở lại đúng
        chỗ.
      </p>
    );
  }
  return (
    <ul className="item-list">
      {sessions.map((session) => (
        <li key={session.id}>
          <div>
            <h3>{formatStudyDay(session.taughtOn)}</h3>
            <p className="item-meta">{describeSession(session)}</p>
            {session.notes && <p className="small session-notes">{session.notes}</p>}
          </div>
          <div className="button-row">
            {session.lesson && session.slideReached && (
              <Link
                href={slidePresenterPath(
                  session.lesson.id,
                  session.lesson.versionId,
                  session.slideReached,
                  classId,
                )}
              >
                Mở slide {session.slideReached}
              </Link>
            )}
            <DeleteSessionButton classId={classId} sessionId={session.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}
