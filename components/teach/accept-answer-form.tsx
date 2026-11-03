"use client";

import { createContext, use, useActionState, useState } from "react";

import { acceptAnswerAction } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";

import type { ActionState } from "@/app/actions/classes";
import type { ReactNode } from "react";

const AnnounceContext = createContext<(message: string) => void>(() => undefined);

// A regrade turns the answer correct, so the form that sent it leaves the page (or the "wrong"
// filter); the result stays here, at the bottom of the screen, until it is closed.
export function AcceptNoticeArea({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState("");
  return (
    <AnnounceContext value={setNotice}>
      {children}
      <div role="status" className={notice ? "accept-notice" : undefined}>
        {notice && (
          <>
            <p>{notice}</p>
            <Button variant="ghost" onClick={() => setNotice("")}>
              Đóng
            </Button>
          </>
        )}
      </div>
    </AnnounceContext>
  );
}

interface AcceptAnswerFormProps {
  classId: string;
  studentId: string;
  assignmentId: string;
  questionId: string;
  questionNumber: number;
}

// The server reads the learner's answer itself; the form only names which one.
export function AcceptAnswerForm({
  classId,
  studentId,
  assignmentId,
  questionId,
  questionNumber,
}: AcceptAnswerFormProps) {
  const announce = use(AnnounceContext);
  const [state, action, isPending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const next = await acceptAnswerAction(previous, formData);
      if (next.notice) {
        announce(next.notice);
      }
      return next;
    },
    {},
  );
  return (
    <form action={action} className="accept-answer">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="questionId" value={questionId} />
      <Button
        type="submit"
        variant="outline"
        disabled={isPending}
        aria-label={`Chấp nhận câu trả lời của câu ${questionNumber}`}
      >
        {isPending ? "Đang chấm lại…" : "Chấp nhận câu trả lời này"}
      </Button>
      <p className="small muted">
        Cộng điểm cho mọi bài làm trong bài này có câu trả lời tương đương. Với bài luyện tập, các
        bài luyện sau từ cùng bài học cũng chấp nhận câu trả lời này.
      </p>
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
    </form>
  );
}
