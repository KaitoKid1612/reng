import { Check, X } from "lucide-react";

interface AnswerFeedbackProps {
  isCorrect: boolean;
  correctText: string;
  explain: string;
  transcript?: string | null;
  // The correct answer's language, which follows how it is typed (pinyin, Chinese, Japanese…).
  lang?: string;
  // The language the audio speaks; by default the same as the answer.
  transcriptLang?: string;
}

export function AnswerFeedback({
  isCorrect,
  correctText,
  explain,
  transcript,
  lang = "ja",
  transcriptLang = lang,
}: AnswerFeedbackProps) {
  return (
    <div
      className={`answer-feedback ${isCorrect ? "feedback-correct" : "feedback-wrong"}`}
      role="status"
    >
      {isCorrect ? <Check size={20} aria-hidden="true" /> : <X size={20} aria-hidden="true" />}
      <div>
        <p>
          {isCorrect ? "Đúng rồi!" : "Chưa đúng."} Đáp án:{" "}
          <strong lang={lang}>{correctText}</strong>
        </p>
        <p className="muted">{explain}</p>
        {transcript && (
          <p className="transcript">
            Lời nghe: <span lang={transcriptLang}>{transcript}</span>
          </p>
        )}
      </div>
    </div>
  );
}
