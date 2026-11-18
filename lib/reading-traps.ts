// Wrong readings that look like the right one, the way the JLPT "how is this read" part
// (もんだい1) builds its options: voiced or not (ふべん / ぶべん), a long vowel kept or dropped
// (しゅう / しゅ), a small っ or ゅ, ち for し. The official papers often cross two such changes
// into four options (ふべん, ぶべん, ふへん, ぶへん), so two edits and their combination come first.

type EditCategory =
  "voice" | "long-drop" | "sokuon-drop" | "long-add" | "sokuon-add" | "small" | "swap";

interface Edit {
  category: EditCategory;
  position: number;
  action: "replace" | "remove" | "insert";
  value: string;
}

const CATEGORY_ORDER: readonly EditCategory[] = [
  "voice",
  "long-drop",
  "sokuon-drop",
  "long-add",
  "small",
  "sokuon-add",
  "swap",
];

const VOICE_PAIRS = [
  "かが",
  "きぎ",
  "くぐ",
  "けげ",
  "こご",
  "さざ",
  "しじ",
  "すず",
  "せぜ",
  "そぞ",
  "ただ",
  "てで",
  "とど",
  "はばぱ",
  "ひびぴ",
  "ふぶぷ",
  "へべぺ",
  "ほぼぽ",
];
const VOICE = new Map<string, string[]>(
  VOICE_PAIRS.flatMap((group) =>
    [...group].map((kana) => [kana, [...group].filter((other) => other !== kana)] as const),
  ),
);
const SWAPS = new Map<string, string>([
  ["ち", "し"],
  ["し", "ち"],
]);
const SMALL_TO_BIG = new Map<string, string>([
  ["ゃ", "や"],
  ["ゅ", "ゆ"],
  ["ょ", "よ"],
]);
// Kana ending in an o sound (and ょ), after which う lengthens the vowel: こう, しょう.
const O_SOUND = new Set([..."おこごそぞとどのほぼぽもよろょ"]);
const U_SOUND = new Set([..."くぐすずつぬふぶぷむゆるゅ"]);
const E_SOUND = new Set([..."えけげせぜてでねへべぺめれ"]);
const I_SOUND = new Set([..."きぎしじちにひびぴみり"]);
// A small っ only doubles k, s, t and p sounds.
const DOUBLES = new Set([..."かきくけこさしすせそたちつてとぱぴぷぺぽ"]);
const SMALL = new Set([..."ゃゅょぁぃぅぇぉ"]);
const P_ROW = new Set([..."ぱぴぷぺぽ"]);
const HIRAGANA = /^[ぁ-ゖー]+$/u;

function listEdits(chars: readonly string[]): Edit[] {
  const edits: Edit[] = [];
  chars.forEach((kana, position) => {
    const previous = chars[position - 1];
    const next = chars[position + 1];
    for (const value of VOICE.get(kana) ?? []) {
      // A p sound (ぴゃく) only comes after っ or ん, so たぺる would give itself away.
      if (P_ROW.has(value) && previous !== "っ" && previous !== "ん") {
        continue;
      }
      edits.push({ category: "voice", position, action: "replace", value });
    }
    const swap = SWAPS.get(kana);
    if (swap) {
      edits.push({ category: "swap", position, action: "replace", value: swap });
    }
    const big = SMALL_TO_BIG.get(kana);
    if (big) {
      edits.push({ category: "small", position, action: "replace", value: big });
    }
    if (kana === "っ") {
      edits.push({ category: "sokuon-drop", position, action: "remove", value: "" });
    }
    if (
      previous &&
      ((kana === "う" && (O_SOUND.has(previous) || U_SOUND.has(previous))) ||
        (kana === "い" && (E_SOUND.has(previous) || I_SOUND.has(previous))))
    ) {
      edits.push({ category: "long-drop", position, action: "remove", value: "" });
    }
    // A long vowel is added after an o sound or ゅ (と → とう, しゅ → しゅう), never before ん
    // (ほうん) or a small kana that belongs to this one.
    if (
      (O_SOUND.has(kana) || kana === "ゅ") &&
      next !== "う" &&
      next !== "ん" &&
      !SMALL.has(next ?? "")
    ) {
      edits.push({ category: "long-add", position: position + 1, action: "insert", value: "う" });
    }
    if (
      position > 0 &&
      DOUBLES.has(kana) &&
      previous !== "っ" &&
      previous !== "ん" &&
      previous !== "ー"
    ) {
      edits.push({ category: "sokuon-add", position, action: "insert", value: "っ" });
    }
  });
  return edits;
}

function apply(chars: readonly string[], edits: readonly Edit[]) {
  const result = [...chars];
  // The later position first, so the earlier one still points at its kana.
  for (const edit of [...edits].sort((a, b) => b.position - a.position)) {
    if (edit.action === "replace") {
      result[edit.position] = edit.value;
    } else if (edit.action === "remove") {
      result.splice(edit.position, 1);
    } else {
      result.splice(edit.position, 0, edit.value);
    }
  }
  return result.join("");
}

function isReadable(reading: string) {
  return HIRAGANA.test(reading) && !reading.startsWith("っ") && !reading.endsWith("っ");
}

function pick<T>(items: readonly T[], random: () => number) {
  return items[Math.floor(random() * items.length)];
}

// Earlier categories are the classic exam traps; a later one is used only when no earlier one
// applies to the word.
function pickEdit(edits: readonly Edit[], random: () => number) {
  for (const category of CATEGORY_ORDER) {
    const inCategory = edits.filter((edit) => edit.category === category);
    if (inCategory.length) {
      return pick(inCategory, random);
    }
  }
  return undefined;
}

/**
 * Up to `count` wrong readings for a hiragana reading. Readings in other scripts (katakana words,
 * pinyin) give none, so the caller falls back to other words' readings.
 */
export function buildReadingTraps(reading: string, count = 3, random: () => number = Math.random) {
  if (!HIRAGANA.test(reading)) {
    return [];
  }
  const chars = [...reading];
  const edits = listEdits(chars);
  const traps = new Set<string>();
  const add = (value: string) => {
    if (value !== reading && isReadable(value) && traps.size < count) {
      traps.add(value);
    }
  };
  const first = pickEdit(edits, random);
  const second =
    first &&
    pickEdit(
      edits.filter((edit) => Math.abs(edit.position - first.position) > 0),
      random,
    );
  if (first && second) {
    add(apply(chars, [first]));
    add(apply(chars, [second]));
    add(apply(chars, [first, second]));
  }
  for (const edit of edits.toSorted(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  )) {
    add(apply(chars, [edit]));
  }
  return [...traps];
}
