// Portraits of the recurring characters in Japanese lesson dialogues, keyed by the speaker
// name without furigana (for example "ナム" or "先生"). Images are added once generated and
// reviewed (docs/illustrations.md); speakers without one get an initial.
export const CHARACTER_PICTURES: Readonly<Record<string, string>> = {};

// Alternates sides by order of first appearance: the first speaker on the left, the second
// on the right, and so on.
export function dialogueSides(speakers: readonly string[]) {
  const order: string[] = [];
  return speakers.map((speaker) => {
    if (!order.includes(speaker)) {
      order.push(speaker);
    }
    return order.indexOf(speaker) % 2 === 0 ? "start" : "end";
  });
}
