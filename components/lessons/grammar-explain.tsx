import { JapaneseText } from "@/components/lessons/japanese-text";
import { explainPoints } from "@/lib/grammar-search";

// A grammar explanation one sentence per line, so its parts (use, how to join, how to ask) read
// as a list rather than one block. A single sentence stays a paragraph.
export function GrammarExplain({ text }: { text: string }) {
  const points = explainPoints(text);
  if (points.length < 2) {
    return (
      <p className="grammar-points">
        <JapaneseText text={text} />
      </p>
    );
  }
  return (
    <ul className="grammar-points">
      {points.map((point, index) => (
        <li key={index}>
          <JapaneseText text={point} />
        </li>
      ))}
    </ul>
  );
}
