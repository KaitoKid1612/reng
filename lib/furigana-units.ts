// Furigana is stored inline as {漢字|かんじ}, but teachers edit it as plain text plus one reading
// per kanji word: a run of kanji, with any digits written just before it (7時, １週間, 一冊).
// Turning the stored text into that draft and back keeps every word that has no reading as it was.

const MARK = /\{([^{}|]+)\|([^{}|]+)\}/g;
const UNIT = /[0-9０-９]*[\p{Script=Han}々〆ヵヶ]+/gu;
const KANA_READING = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;

export interface ReadingUnit {
  text: string;
  start: number;
  end: number;
}

export interface FuriganaDraft {
  /** The text as learners read it without furigana. */
  text: string;
  /** One reading per unit of `text`, in order; empty means no furigana there. */
  readings: string[];
}

export function listReadingUnits(text: string): ReadingUnit[] {
  return [...text.matchAll(UNIT)].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

export const isKanaReading = (reading: string) => KANA_READING.test(reading.trim());

/**
 * Splits stored text into the plain text and one reading per unit. A mark that also covers kana
 * ({お茶|おちゃ}) gives its kanji the reading without that kana; marks that together cover a unit
 * ({毎週|まいしゅう}{土曜日|どようび}) give it their readings joined, so no reading is lost.
 * `unmatched` counts marks that fit neither way, whose reading the teacher has to type again.
 */
export function toFuriganaDraft(stored: string): FuriganaDraft & { unmatched: number } {
  let text = "";
  let position = 0;
  const marks: { start: number; end: number; base: string; reading: string }[] = [];
  for (const match of stored.matchAll(MARK)) {
    text += stored.slice(position, match.index);
    const start = text.length;
    text += match[1];
    marks.push({ start, end: text.length, base: match[1], reading: match[2].trim() });
    position = match.index + match[0].length;
  }
  text += stored.slice(position);
  const units = listReadingUnits(text);
  const used = new Set<number>();
  const readings = units.map((unit) => {
    const inside = marks.filter((mark) => unit.start <= mark.start && mark.end <= unit.end);
    const tiles =
      inside.length > 1 &&
      inside[0].start === unit.start &&
      inside.at(-1)?.end === unit.end &&
      inside.every((mark, item) => item === 0 || inside[item - 1].end === mark.start);
    if (tiles) {
      inside.forEach((mark) => used.add(marks.indexOf(mark)));
      return inside.map((mark) => mark.reading).join("");
    }
    const index = marks.findIndex((mark) => mark.start <= unit.start && unit.end <= mark.end);
    const mark = marks[index];
    if (!mark) {
      return "";
    }
    const unitsInMark = units.filter((item) => mark.start <= item.start && item.end <= mark.end);
    const prefix = mark.base.slice(0, unit.start - mark.start).trim();
    const suffix = mark.base.slice(unit.end - mark.start).trim();
    if (
      unitsInMark.length !== 1 ||
      !mark.reading.startsWith(prefix) ||
      !mark.reading.endsWith(suffix) ||
      mark.reading.length <= prefix.length + suffix.length
    ) {
      return "";
    }
    used.add(index);
    return mark.reading.slice(prefix.length, mark.reading.length - suffix.length);
  });
  return { text, readings, unmatched: marks.length - used.size };
}

/** The stored form: each unit with a reading becomes {unit|reading}; nothing else changes. */
export function fromFuriganaDraft({ text, readings }: FuriganaDraft) {
  let result = "";
  let position = 0;
  listReadingUnits(text).forEach((unit, index) => {
    const reading = readings[index]?.trim() ?? "";
    result +=
      text.slice(position, unit.start) + (reading ? `{${unit.text}|${reading}}` : unit.text);
    position = unit.end;
  });
  return result + text.slice(position);
}

/**
 * Keeps readings while the teacher edits the text: the n-th 学校 keeps the n-th 学校's reading,
 * and a word added again starts with the reading it already has elsewhere.
 */
export function carryReadings(previous: FuriganaDraft, nextText: string): string[] {
  const byWord = new Map<string, string[]>();
  listReadingUnits(previous.text).forEach((unit, index) => {
    byWord.set(unit.text, [...(byWord.get(unit.text) ?? []), previous.readings[index] ?? ""]);
  });
  const seen = new Map<string, number>();
  return listReadingUnits(nextText).map((unit) => {
    const count = seen.get(unit.text) ?? 0;
    seen.set(unit.text, count + 1);
    const known = byWord.get(unit.text) ?? [];
    return known[count] ?? known.find(Boolean) ?? "";
  });
}

/** Units of the stored text that have no reading yet. */
export function countUnreadUnits(stored: string) {
  return toFuriganaDraft(stored).readings.filter((reading) => !reading).length;
}
