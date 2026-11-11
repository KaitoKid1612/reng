import { FuriganaText } from "@/components/lessons/japanese-text";
import { splitSpeakerTurns } from "@/lib/listening-dialogue";

interface TranscriptTextProps {
  text: string;
}

function speakerTurns(text: string) {
  try {
    return splitSpeakerTurns(text);
  } catch {
    return null;
  }
}

// A labelled transcript (ナレーター：…女：…男：…) reads as a dialogue, one turn per line; a
// narration by one voice stays a single line.
export function TranscriptText({ text }: TranscriptTextProps) {
  const turns = speakerTurns(text);
  if (!turns) {
    return <FuriganaText text={text} />;
  }
  return (
    <span className="transcript-turns">
      {turns.map((turn, index) => (
        <span key={index} className="transcript-turn">
          <span className="transcript-speaker">{turn.speaker}：</span>
          <FuriganaText text={turn.text} />
        </span>
      ))}
    </span>
  );
}
