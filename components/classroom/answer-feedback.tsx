import { Check, X } from "lucide-react";

import { TranscriptText } from "@/components/classroom/transcript-text";
import { FuriganaText } from "@/components/lessons/japanese-text";

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
          <strong lang={lang}>
            <FuriganaText text={correctText} />
          </strong>
        </p>
        <p className="muted">
          <FuriganaText text={explain} />
        </p>
        {transcript && (
          <p className="transcript">
            Lời nghe:{" "}
            <span lang={transcriptLang}>
              <TranscriptText text={transcript} />
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
