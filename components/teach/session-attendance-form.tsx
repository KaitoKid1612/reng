"use client";

import { useActionState, useState } from "react";

import { sessionAttendanceAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";
import { describeAttendance } from "@/lib/class-sessions";

import type { AttendanceMark } from "@/lib/class-sessions";

export interface AttendanceMember {
  userId: string;
  fullName: string;
}

interface SessionAttendanceFormProps {
  classId: string;
  sessionId: string;
  /** Learners who were in the class on the day of the session. */
  members: AttendanceMember[];
  marks: AttendanceMark[];
  /** The newest session without attendance opens, so the teacher marks it right after logging. */
  isOpenByDefault: boolean;
}

export function SessionAttendanceForm({
  classId,
  sessionId,
  members,
  marks,
  isOpenByDefault,
}: SessionAttendanceFormProps) {
  const [state, action, isPending] = useActionState(sessionAttendanceAction, {});
  // Saving marks the session, which would close it through isOpenByDefault and hide the notice;
  // after the first render the panel stays as the teacher left it.
  const [isOpen, setIsOpen] = useState(isOpenByDefault);
  const isTaken = marks.length > 0;
  // Most of a class comes, so before attendance is taken everyone starts ticked and the teacher
  // only unticks who missed it. Once taken, a learner without a mark was not counted then.
  const isPresent = (userId: string) =>
    marks.find((mark) => mark.userId === userId)?.isPresent ?? !isTaken;

  return (
    <details
      className="session-attendance"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>Điểm danh: {describeAttendance(marks)}</summary>
      {members.length ? (
        <form action={action}>
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <fieldset>
            <legend className="small muted">
              Bỏ chọn học viên vắng buổi này. Học viên không thấy điểm danh.
            </legend>
            <div className="option-row">
              {members.map((member) => (
                <label key={member.userId} className="choice-label">
                  <input type="hidden" name="memberId" value={member.userId} />
                  <input
                    type="checkbox"
                    name="presentId"
                    value={member.userId}
                    defaultChecked={isPresent(member.userId)}
                  />
                  {member.fullName}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" variant="outline" disabled={isPending}>
            {isPending ? "Đang lưu…" : "Lưu điểm danh"}
          </Button>
          <ActionFeedback state={state} />
        </form>
      ) : (
        <p className="small muted">Chưa có học viên nào trong lớp vào ngày này.</p>
      )}
    </details>
  );
}
