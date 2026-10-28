import { PronunciationButton } from "@/components/lessons/pronunciation-button";

import type { LessonContent } from "@/lib/lesson-schema";

interface VocabCardFaceProps {
  lessonId: string;
  vocab: LessonContent["vocab"][number];
  isFlipped: boolean;
}

export function VocabCardFace({ lessonId, vocab, isFlipped }: VocabCardFaceProps) {
  return (
    <div className="flashcard" data-flipped={isFlipped}>
      <span className="flashcard-front" lang="ja">
        {vocab.kanji || vocab.jp}
      </span>
      {isFlipped && (
        <div className="flashcard-back">
          {vocab.kanji && vocab.kanji !== vocab.jp && (
            <p lang="ja" className="reading-text">
              {vocab.jp}
            </p>
          )}
          <p className="small muted">{vocab.romaji}</p>
          <p>{vocab.vi}</p>
          <PronunciationButton
            id={`${lessonId}:${vocab.id}`}
            text={vocab.jp}
            label={vocab.romaji}
            audio={vocab.audio}
          />
        </div>
      )}
    </div>
  );
}
