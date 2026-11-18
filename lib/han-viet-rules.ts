import type { JlptKanji } from "@/lib/jlpt-kanji";

// The ending of a kanji's Sino-Vietnamese reading predicts how its on reading ends, because both
// come from Middle Chinese: HỌC → がく, NHẬT → にち, ĐÔNG → とう, SƠN → さん. The page shows how
// often each rule holds on Reng's own N5/N4 data, exceptions included, rather than claiming it.
export interface HanVietRule {
  id: string;
  // Which part of the Hán Việt syllable the rule reads, and of the on reading it predicts.
  part: "ending" | "start";
  hanViet: string;
  on: string;
  test: (syllable: string) => boolean;
  matches: (onReading: string) => boolean;
}

const KA_ROW = /^[かきくけこがぎぐげご]/u;
const SA_ROW = /^[さしすせそざじずぜぞ]/u;

const ENDING_RULES: HanVietRule[] = [
  {
    id: "c",
    part: "ending",
    hanViet: "-c, -ch",
    on: "く hoặc き",
    test: (syllable) => /(?:c|ch)$/u.test(syllable),
    matches: (reading) => /[くき]$/u.test(reading),
  },
  {
    id: "t",
    part: "ending",
    hanViet: "-t",
    on: "つ hoặc ち",
    test: (syllable) => /t$/u.test(syllable),
    matches: (reading) => /[つち]$/u.test(reading),
  },
  {
    id: "p",
    part: "ending",
    hanViet: "-p",
    on: "trường âm う (ゅう, ょう, おう…)",
    test: (syllable) => /p$/u.test(syllable),
    matches: (reading) => /う$/u.test(reading),
  },
  {
    id: "ng",
    part: "ending",
    hanViet: "-ng, -nh",
    on: "trường âm う hoặc い (とう, せい, きょう…)",
    test: (syllable) => /(?:ng|nh)$/u.test(syllable),
    matches: (reading) => /[うい]$/u.test(reading),
  },
  {
    id: "nm",
    part: "ending",
    hanViet: "-n, -m",
    on: "ん",
    test: (syllable) => /[nm]$/u.test(syllable),
    matches: (reading) => /ん$/u.test(reading),
  },
  {
    id: "vu",
    part: "ending",
    hanViet: "-ao, -au, -âu, -iêu, -ưu, -eo",
    on: "trường âm う (こう, しょう, きゅう…)",
    test: (syllable) => /[aeiouy][uo]$/u.test(syllable),
    matches: (reading) => /う$/u.test(reading),
  },
  {
    id: "vi",
    part: "ending",
    hanViet: "-ai, -ay, -ôi, -oi, -ơi, -uy",
    on: "thường có い ở cuối (かい, まい, すい…)",
    test: (syllable) => /[aeiouy][iy]$/u.test(syllable),
    matches: (reading) => /い$/u.test(reading),
  },
  {
    id: "v",
    part: "ending",
    hanViet: "một nguyên âm (a, e, i, o, u, y…)",
    on: "không có ん, く, き, つ, ち ở cuối; thường là âm ngắn (ご, し, か)",
    test: (syllable) => /[aeiouy]$/u.test(syllable),
    // チ or キ alone is the whole syllable, not a final consonant (池 チ, 記 キ).
    matches: (reading) => !/ん$/u.test(reading) && !/.[くきつち]$/u.test(reading),
  },
];

// Initials are less regular than endings; only those that hold on most of the data are listed.
const START_RULES: HanVietRule[] = [
  {
    id: "k",
    part: "start",
    hanViet: "c, k, qu, kh, gi",
    on: "hàng か hoặc が (か き く け こ, が…)",
    test: (syllable) => /^(?:kh|gi|qu|c(?!h)|k)/u.test(syllable),
    matches: (reading) => KA_ROW.test(reading),
  },
  {
    id: "h",
    part: "start",
    hanViet: "h",
    on: "hàng か hoặc が",
    test: (syllable) => /^h/u.test(syllable),
    matches: (reading) => KA_ROW.test(reading),
  },
  {
    id: "ng",
    part: "start",
    hanViet: "ng, ngh",
    on: "hàng が (が ぎ ぐ げ ご)",
    test: (syllable) => /^ng/u.test(syllable),
    matches: (reading) => /^[がぎぐげご]/u.test(reading),
  },
  {
    id: "nh",
    part: "start",
    hanViet: "nh",
    on: "に hoặc じ (にち, にん, じん)",
    test: (syllable) => /^nh/u.test(syllable),
    matches: (reading) => /^[にじ]/u.test(reading),
  },
  {
    id: "dd",
    part: "start",
    hanViet: "đ",
    on: "hàng た hoặc だ (と, とう, でん, ど…)",
    test: (syllable) => /^đ/u.test(syllable),
    matches: (reading) => /^[たちつてとだぢづでど]/u.test(reading),
  },
  {
    id: "t",
    part: "start",
    hanViet: "t",
    on: "hàng さ hoặc ざ (さん, せん, し…)",
    test: (syllable) => /^t(?![hr])/u.test(syllable),
    matches: (reading) => SA_ROW.test(reading),
  },
  {
    id: "th",
    part: "start",
    hanViet: "th",
    on: "thường hàng さ hoặc ざ, đôi khi hàng た",
    test: (syllable) => /^th/u.test(syllable),
    matches: (reading) => SA_ROW.test(reading) || /^[たちつてと]/u.test(reading),
  },
  {
    id: "ch",
    part: "start",
    hanViet: "ch, tr",
    on: "ち, し hoặc じ (ちゅう, しょ, じゅう)",
    test: (syllable) => /^(?:ch|tr)/u.test(syllable),
    matches: (reading) => /^[ちしじ]/u.test(reading),
  },
  {
    id: "s",
    part: "start",
    hanViet: "s, x",
    on: "hàng さ hoặc ざ",
    test: (syllable) => /^[sx]/u.test(syllable),
    matches: (reading) => SA_ROW.test(reading),
  },
  {
    id: "b",
    part: "start",
    hanViet: "b, ph",
    on: "hàng は, ば hoặc ぱ (は, ふ, ぶん, ほく…)",
    test: (syllable) => /^(?:b|ph)/u.test(syllable),
    matches: (reading) => /^[はひふへほばびぶべぼぱぴぷぺぽ]/u.test(reading),
  },
  {
    id: "m",
    part: "start",
    hanViet: "m",
    on: "hàng ま hoặc ば (まい, もく, ぼ…)",
    test: (syllable) => /^m/u.test(syllable),
    matches: (reading) => /^[まみむめもばびぶべぼ]/u.test(reading),
  },
  {
    id: "l",
    part: "start",
    hanViet: "l",
    on: "hàng ら (ら り る れ ろ)",
    test: (syllable) => /^l/u.test(syllable),
    matches: (reading) => /^[らりるれろ]/u.test(reading),
  },
];

export const HAN_VIET_RULES: readonly HanVietRule[] = [...ENDING_RULES, ...START_RULES];

/** The first syllable of a Hán Việt reading without vowel marks: "Trường / Trưởng" → "truong",
 * "Đông" → "đong" (đ is its own initial). */
export function plainHanViet(hanViet: string) {
  return (hanViet.split(/[,/]/u)[0] ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .normalize("NFC");
}

function toHiragana(value: string) {
  return value.replace(/[ァ-ヶ]/gu, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60),
  );
}

/** The rule of one part (ending or start) that applies to a Hán Việt reading, if any. */
export function hanVietRuleOf(hanViet: string, part: HanVietRule["part"]) {
  const syllable = plainHanViet(hanViet);
  return HAN_VIET_RULES.find((rule) => rule.part === part && rule.test(syllable)) ?? null;
}

/** Whether one of the kanji's on readings has the start or ending its rule predicts. */
export function followsHanVietRule(item: Pick<JlptKanji, "on">, rule: HanVietRule) {
  return item.on.some((reading) => rule.matches(toHiragana(reading)));
}

export interface HanVietRuleSummary {
  rule: HanVietRule;
  followers: JlptKanji[];
  exceptions: JlptKanji[];
}

/** For each rule, the kanji (with an on reading) that follow it and the ones that do not. */
export function summarizeHanVietRules(items: readonly JlptKanji[]): HanVietRuleSummary[] {
  return HAN_VIET_RULES.map((rule) => {
    const ruled = items.filter(
      (item) => item.on.length && hanVietRuleOf(item.hanViet, rule.part) === rule,
    );
    return {
      rule,
      followers: ruled.filter((item) => followsHanVietRule(item, rule)),
      exceptions: ruled.filter((item) => !followsHanVietRule(item, rule)),
    };
  });
}
