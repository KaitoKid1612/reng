import { Check, X } from "lucide-react";

interface AnswerFeedbackProps {
  isCorrect: boolean;
  correctText: string;
  explain: string;
  transcript?: string | null;
}

export function AnswerFeedback({
  isCorrect,
  correctText,
  explain,
  transcript,
}: AnswerFeedbackProps) {
  return (
    <div
      className={`answer-feedback ${isCorrect ? "feedback-correct" : "feedback-wrong"}`}
      role="status"
    >
      {isCorrect ? <Check size={20} aria-hidden="true" /> : <X size={20} aria-hidden="true" />}
      <div>
        <p>
          {isCorrect ? "Đúng rồi!" : "Chưa đúng."} Đáp án: <strong lang="ja">{correctText}</strong>
        </p>
        <p className="muted">{explain}</p>
        {transcript && (
          <p className="transcript">
            Transcript: <span lang="ja">{transcript}</span>
          </p>
        )}
      </div>
    </div>
  );
}
