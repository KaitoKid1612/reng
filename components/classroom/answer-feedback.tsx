import { Check, X } from "lucide-react";

interface AnswerFeedbackProps {
  isCorrect: boolean;
  correctText: string;
  explain: string;
}

export function AnswerFeedback({ isCorrect, correctText, explain }: AnswerFeedbackProps) {
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
      </div>
    </div>
  );
}
