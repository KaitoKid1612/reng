import { PronunciationButton } from "@/components/lessons/pronunciation-button";

import type { StudyWord } from "@/lib/study-words";

interface VocabCardFaceProps {
  lessonId: string;
  vocab: StudyWord;
  isFlipped: boolean;
}

export function VocabCardFace({ lessonId, vocab, isFlipped }: VocabCardFaceProps) {
  return (
    <div className="flashcard" data-flipped={isFlipped}>
      <span className="flashcard-front" lang={vocab.lang}>
        {vocab.front}
      </span>
      {isFlipped && (
        <div className="flashcard-back">
          {vocab.reading && (
            <p lang={vocab.readingLang} className="reading-text">
              {vocab.reading}
            </p>
          )}
          {vocab.romanization && <p className="small muted">{vocab.romanization}</p>}
          <p>{vocab.meaning}</p>
          <PronunciationButton
            id={`${lessonId}:${vocab.id}`}
            text={vocab.spokenText}
            label={vocab.audioLabel}
            audio={vocab.audio}
            locale={vocab.locale}
          />
        </div>
      )}
    </div>
  );
}
