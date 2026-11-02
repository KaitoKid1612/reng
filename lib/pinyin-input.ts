// Phone keyboards rarely offer pinyin tone marks, so a tone number typed after a syllable
// (ni3 → nǐ, lv4 → lǜ) becomes the mark. Answers are still graded against tone-marked pinyin.

const TONE_MARKS: Record<string, readonly [string, string, string, string]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
  A: ["Ā", "Á", "Ǎ", "À"],
  E: ["Ē", "É", "Ě", "È"],
  I: ["Ī", "Í", "Ǐ", "Ì"],
  O: ["Ō", "Ó", "Ǒ", "Ò"],
  U: ["Ū", "Ú", "Ǔ", "Ù"],
  Ü: ["Ǖ", "Ǘ", "Ǚ", "Ǜ"],
};

const MARKED_VOWELS = Object.values(TONE_MARKS).flat().join("");
// Syllables typed without spaces (lao3shi1) form one run, marked vowels included.
const RUN_BEFORE_TONE = new RegExp(`([A-Za-zÜü${MARKED_VOWELS}]+)([0-5])$`);
const VOWEL_GROUP = new RegExp(`[aeiouüAEIOUÜ${MARKED_VOWELS}]+`, "g");
const HAS_MARK = new RegExp(`[${MARKED_VOWELS}]`);

// v is the usual keyboard stand-in for ü.
function restoreUmlaut(letters: string) {
  return letters.replace(/v/g, "ü").replace(/V/g, "Ü");
}

// The number belongs to the last syllable of the run, whose vowels are the run's last vowel
// group. The mark goes on a or e, then on the o of "ou", otherwise on the last vowel (guì,
// liú). Neutral tone (5 or 0) only drops the number. Returns null when there is nothing to mark
// or the syllable already has a mark (a second number after hǎo stays as typed).
export function addToneMark(letters: string, tone: number) {
  const run = restoreUmlaut(letters);
  const group = [...run.matchAll(VOWEL_GROUP)].at(-1);
  if (!group || HAS_MARK.test(group[0])) {
    return null;
  }
  if (tone < 1 || tone > 4) {
    return run;
  }
  const lower = group[0].toLowerCase();
  let offset = lower.search(/[ae]/);
  if (offset < 0) {
    offset = lower.includes("ou") ? lower.indexOf("o") : lower.length - 1;
  }
  const position = group.index + offset;
  const marked = TONE_MARKS[run[position]]?.[tone - 1];
  if (!marked) {
    return null;
  }
  return run.slice(0, position) + marked + run.slice(position + 1);
}

// Converts only the run just before the caret, so text already typed elsewhere stays as it is.
export function convertPinyinBeforeCaret(value: string, caret: number) {
  const head = value.slice(0, caret);
  const match = RUN_BEFORE_TONE.exec(head);
  if (!match) {
    return { value, caret };
  }
  const converted = addToneMark(match[1], Number(match[2]));
  if (converted === null) {
    return { value, caret };
  }
  const nextHead = head.slice(0, match.index) + converted;
  return { value: nextHead + value.slice(caret), caret: nextHead.length };
}
