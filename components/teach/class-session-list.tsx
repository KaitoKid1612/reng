import Link from "next/link";

import { DeleteSessionButton } from "@/components/teach/delete-session-button";
import { SessionAttendanceForm } from "@/components/teach/session-attendance-form";
import { findFrequentAbsences, slidePresenterPath } from "@/lib/class-sessions";
import { formatStudyDay, toStudyDay } from "@/lib/study-days";

import type { AttendanceMember } from "@/components/teach/session-attendance-form";
import type { ClassSession } from "@/lib/server/class-sessions";

export interface SessionMember extends AttendanceMember {
  joinedAt: string;
}

interface ClassSessionListProps {
  classId: string;
  sessions: ClassSession[];
  /** Current learners of the class, for attendance. */
  members: SessionMember[];
}

interface FrequentAbsencesProps {
  sessions: ClassSession[];
  members: SessionMember[];
}

function describeSession(session: ClassSession) {
  if (!session.lesson) {
    return "Không dùng bài trong lớp";
  }
  const lesson = `${session.lesson.title} (phiên bản ${session.lesson.versionNo})`;
  return session.slideReached ? `${lesson}, đến slide ${session.slideReached}` : lesson;
}

// Who to check on before the next session: current learners who missed some of the logged sessions.
function FrequentAbsences({ sessions, members }: FrequentAbsencesProps) {
  const absences = findFrequentAbsences(
    sessions.map((session) => ({ marks: session.marks ?? [] })),
  ).flatMap((total) => {
    const member = members.find((item) => item.userId === total.userId);
    return member ? [{ ...total, fullName: member.fullName }] : [];
  });
  if (!absences.length) {
    return null;
  }
  return (
    <p className="small">
      <strong>Vắng trong các buổi đã điểm danh:</strong>{" "}
      {absences
        .map((total) => `${total.fullName} (vắng ${total.absent}/${total.marked} buổi)`)
        .join(", ")}
    </p>
  );
}

export function ClassSessionList({ classId, sessions, members }: ClassSessionListProps) {
  if (!sessions.length) {
    return (
      <p className="muted">
        Chưa ghi buổi dạy nào. Sau mỗi buổi, ghi bài và slide đã dạy tới để buổi sau mở lại đúng
        chỗ.
      </p>
    );
  }
  // A learner who joined after the session day was not part of that session.
  const membersOn = (day: string) => members.filter((member) => toStudyDay(member.joinedAt) <= day);
  const [newest] = sessions;
  const isNewestUnmarked = newest.marks?.length === 0 && membersOn(newest.taughtOn).length > 0;
  return (
    <>
      <FrequentAbsences sessions={sessions} members={members} />
      <ul className="item-list">
        {sessions.map((session) => (
          <li key={session.id}>
            <div>
              <h3>{formatStudyDay(session.taughtOn)}</h3>
              <p className="item-meta">{describeSession(session)}</p>
              {session.notes && <p className="small session-notes">{session.notes}</p>}
              {session.marks && (
                <SessionAttendanceForm
                  classId={classId}
                  sessionId={session.id}
                  members={membersOn(session.taughtOn).map(({ userId, fullName }) => ({
                    userId,
                    fullName,
                  }))}
                  marks={session.marks}
                  isOpenByDefault={session === newest && isNewestUnmarked}
                />
              )}
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
    </>
  );
}
