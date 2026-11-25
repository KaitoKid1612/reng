import { Check, X } from "lucide-react";

import { GrammarLinkList } from "@/components/classroom/grammar-link-list";
import { TranscriptText } from "@/components/classroom/transcript-text";
import { FuriganaText } from "@/components/lessons/japanese-text";

import type { GrammarLink } from "@/lib/grammar-links";

interface AnswerFeedbackProps {
  isCorrect: boolean;
  correctText: string;
  explain: string;
  transcript?: string | null;
  // The correct answer's language, which follows how it is typed (pinyin, Chinese, Japanese…).
  lang?: string;
  // The language the audio speaks; by default the same as the answer.
  transcriptLang?: string;
  // Class lessons that explain the grammar point the question tests.
  grammarLinks?: readonly GrammarLink[];
  // Why a near miss is wrong, such as a particle typed as it sounds.
  hint?: string | null;
}

export function AnswerFeedback({
  isCorrect,
  correctText,
  explain,
  transcript,
  lang = "ja",
  transcriptLang = lang,
  grammarLinks = [],
  hint = null,
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
        {hint && (
          <p className="answer-hint">
            <strong>{hint}</strong>
          </p>
        )}
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
        <GrammarLinkList links={grammarLinks} />
      </div>
    </div>
  );
}
