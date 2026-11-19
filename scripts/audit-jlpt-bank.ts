// Checks an N4 review bank against the JLPT N4 format, as done on 19/11/2026
// (docs/testing/n4-bank-audit-2026-11-19.md): questions per part and how many 67-question daily
// sets the bank fills before repeating, the shape of each part (underlined word, blank, ★, ［n］,
// passage), passage lengths, kanji beyond N5/N4 written without furigana, duplicates, Vietnamese
// explanations and the listening format. Read-only.
//
//   npm run audit:jlpt-bank -- content/review-banks/n4-daily-with-listening.json
import { readFileSync, existsSync } from "node:fs";

import { jlptPartOf, planJlptDailyParts } from "@/lib/jlpt-parts";
import { hasBrokenFurigana } from "@/lib/japanese-text";
import n5 from "@/content/kanji/n5.json";
import n4 from "@/content/kanji/n4.json";

const file = process.argv[2];
if (!file) {
  throw new Error("Usage: npm run audit:jlpt-bank -- <bank.json>");
}
const raw = JSON.parse(readFileSync(file, "utf8"));
interface BankQuestion {
  id: string;
  type: string;
  responseType?: string;
  tags?: string[];
  prompt?: string;
  instruction?: string;
  options?: string[];
  answer?: number[];
  passage?: string;
  explain?: string;
  audio?: string;
  transcript?: string;
}
const questions: BankQuestion[] = (raw.content ?? raw).questions;
const KNOWN = new Set([...n5.items, ...n4.items].map((i) => i.kanji));
const HAN = /\p{Script=Han}/gu;
const issues: Record<string, string[]> = {};
const add = (kind: string, msg: string) => (issues[kind] ??= []).push(msg);
const stripFurigana = (s: string) => s.replace(/\{([^|{}]+)\|[^{}]+\}/gu, "");
const plain = (s: string) => s.replace(/\{([^|{}]+)\|[^{}]+\}/gu, "$1").replace(/\[\[|\]\]/g, "");
const isKana = (s: string) => /^[ぁ-ゖァ-ヶー〜\s　]+$/u.test(plain(s));
const MONDAI: Record<string, string> = {
  "kanji-reading": "もんだい１",
  orthography: "もんだい２",
  contextual: "もんだい３",
  paraphrase: "もんだい４",
  usage: "もんだい５",
  "grammar-form": "もんだい１",
  composition: "もんだい２",
  "text-grammar": "もんだい３",
  "short-reading": "もんだい４",
  "mid-reading": "もんだい５",
  "info-search": "もんだい６",
};
const manifestFiles = [
  "content/lesson-audio-manifest.json",
  "content/audio-manifest.json",
  "content/jlpt/official-audio-manifest.json",
].filter(existsSync);
const audioIds = new Set<string>();
for (const f of manifestFiles) {
  const m = JSON.parse(readFileSync(f, "utf8"));
  const walk = (o: unknown) => {
    if (o && typeof o === "object") {
      for (const [k, v] of Object.entries(o)) {
        if (/^[0-9a-f]{32}$/.test(k)) {
          audioIds.add(k);
        }
        if (typeof v === "string" && /^[0-9a-f]{32}$/.test(v)) {
          audioIds.add(v);
        }
        walk(v);
      }
    }
  };
  walk(m);
}

const ids = new Set<string>();
const prompts = new Map<string, string>();
const partCounts = new Map<string, number>();
const passages = new Map<string, { part: string; ids: string[]; len: number }>();
const offKanji = new Map<string, number>();

for (const q of questions) {
  const where = q.id;
  if (ids.has(q.id)) {
    add("duplicate-id", where);
  }
  ids.add(q.id);
  const part = jlptPartOf({ type: q.type, tags: q.tags ?? [] });
  if (!part) {
    add("no-part", `${where} tags=${(q.tags ?? []).join(",")}`);
    continue;
  }
  partCounts.set(part.tag, (partCounts.get(part.tag) ?? 0) + 1);
  if (!q.explain || !/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỷỹý]/iu.test(q.explain)) {
    add("explain-missing-or-not-vi", where);
  }
  const texts = [q.prompt ?? "", ...(q.options ?? []), q.passage ?? "", q.explain ?? ""];
  for (const t of texts) {
    if (hasBrokenFurigana(t)) {
      add("broken-furigana", `${where}: ${t.slice(0, 40)}`);
    }
  }
  const key =
    plain(q.prompt ?? "") +
    "|" +
    (q.options ?? []).join("/") +
    "|" +
    (q.passage ?? "").slice(0, 30);
  // 即時応答 shares one instruction and prints only 1–3; its question is in the audio.
  if (prompts.has(key) && part.tag !== "listening-response") {
    add("duplicate-question", `${where} = ${prompts.get(key)}`);
  }
  prompts.set(key, where);
  const opts: string[] = q.options ?? [];
  // Listening parts 3 and 4 (発話表現, 即時応答) have three spoken options in the real test.
  const optionCount = ["listening-utterance", "listening-response"].includes(part.tag) ? 3 : 4;
  if (q.type === "choice" || q.responseType === "choice") {
    if (opts.length !== optionCount) {
      add(`options-not-${optionCount}`, `${where} (${opts.length})`);
    }
    if (new Set(opts).size !== opts.length) {
      add("duplicate-options", where);
    }
    if (
      !Array.isArray(q.answer) ||
      q.answer.length !== 1 ||
      q.answer[0] < 0 ||
      q.answer[0] >= opts.length
    ) {
      add("bad-answer", where);
    }
  }
  if (part.section !== "listening") {
    const want = MONDAI[part.tag];
    if (!(q.instruction ?? "").startsWith(want)) {
      add(
        "instruction-mondai",
        `${where} (${part.tag}) "${(q.instruction ?? "").slice(0, 8)}" want ${want}`,
      );
    }
    for (const t of [q.prompt ?? "", ...opts, q.passage ?? ""]) {
      for (const k of stripFurigana(t).match(HAN) ?? []) {
        if (!KNOWN.has(k)) {
          offKanji.set(k, (offKanji.get(k) ?? 0) + 1);
        }
      }
    }
  }
  const marked = [...(q.prompt ?? "").matchAll(/\[\[(.+?)\]\]/gu)].map((m) => m[1]);
  switch (part.tag) {
    case "kanji-reading":
      if (marked.length !== 1 || !HAN.test(marked[0] ?? "")) {
        add("kanji-reading-shape", `${where}: ${q.prompt}`);
      }
      HAN.lastIndex = 0;
      if (!opts.every(isKana)) {
        add("kanji-reading-options-not-kana", `${where}: ${opts.join("/")}`);
      }
      break;
    case "orthography":
      if (marked.length !== 1 || !isKana(marked[0] ?? "")) {
        add("orthography-shape", `${where}: ${q.prompt}`);
      }
      if (!opts.some((o) => /\p{Script=Han}/u.test(o))) {
        add("orthography-options-no-kanji", `${where}: ${opts.join("/")}`);
      }
      break;
    case "contextual":
    case "grammar-form":
      if (!/（\s*　*\s*）|（　+）/u.test(q.prompt ?? "")) {
        add(`${part.tag}-no-blank`, `${where}: ${q.prompt}`);
      }
      break;
    case "paraphrase":
      if (marked.length !== 1) {
        add("paraphrase-shape", `${where}: ${q.prompt}`);
      }
      break;
    case "usage":
      if (!opts.every((o) => /\[\[.+?\]\]/u.test(o))) {
        add("usage-options-unmarked", `${where}`);
      }
      break;
    case "composition": {
      const stars = ((q.prompt ?? "").match(/★/g) ?? []).length;
      const blanks = ((q.prompt ?? "").match(/＿＿＿＿|＿★＿/g) ?? []).length;
      if (stars !== 1 || blanks !== 4) {
        add("composition-shape", `${where} stars=${stars} blanks=${blanks}`);
      }
      break;
    }
    case "text-grammar": {
      const n = (q.prompt ?? "").match(/［\s*(\d)\s*］/u)?.[1];
      if (!n || !(q.passage ?? "").includes(`［ ${n} ］`)) {
        add("text-grammar-marker", `${where}: ${q.prompt}`);
      }
      break;
    }
  }
  if (q.passage) {
    const k = q.passage;
    const len = plain(k).replace(/[\s　]/gu, "").length;
    const e = passages.get(k) ?? { part: part.tag, ids: [], len };
    e.ids.push(q.id);
    passages.set(k, e);
  } else if (["short-reading", "mid-reading", "info-search", "text-grammar"].includes(part.tag)) {
    add("reading-no-passage", where);
  }
  if (q.type === "listen") {
    if (!q.audio || (audioIds.size && !audioIds.has(q.audio))) {
      add("listen-audio-missing", `${where} ${q.audio}`);
    }
    if (!q.transcript) {
      add("listen-no-transcript", where);
    }
    if (opts.some((o) => /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệịọỏốồổỗộớờởỡợụủứừửữự]/iu.test(o))) {
      add("listen-options-vietnamese", where);
    }
    if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệịọỏốồổỗộớờởỡợụủứừửữự]/iu.test(q.prompt ?? "")) {
      add("listen-prompt-vietnamese", where);
    }
  }
}

console.log(`== ${file}: ${questions.length} questions`);
const plan = planJlptDailyParts("N4", 67, 10);
console.log("part | in bank | per 67-set | sets before a repeat");
for (const { part, count } of plan) {
  const have = partCounts.get(part.tag) ?? 0;
  console.log(
    `${part.label.padEnd(10)} ${part.tag.padEnd(20)} ${String(have).padStart(4)} ${String(count).padStart(4)}  ${count ? (have / count).toFixed(1) : "-"}`,
  );
}
const byPart: Record<string, number[]> = {};
const groupSizes: Record<string, number[]> = {};
for (const p of passages.values()) {
  (byPart[p.part] ??= []).push(p.len);
  (groupSizes[p.part] ??= []).push(p.ids.length);
}
console.log("passages: part | count | chars min/median/max | questions per passage");
for (const [part, lens] of Object.entries(byPart)) {
  const s = lens.toSorted((a, b) => a - b);
  console.log(
    `  ${part.padEnd(14)} ${String(s.length).padStart(3)}  ${s[0]}/${s[Math.floor(s.length / 2)]}/${s[s.length - 1]}  sizes=${[...new Set(groupSizes[part])].join(",")}`,
  );
}
const off = [...offKanji.entries()].sort((a, b) => b[1] - a[1]);
console.log(
  `kanji outside N5/N4 without furigana: ${off.length} chars, ${off.reduce((t, [, n]) => t + n, 0)} uses: ${off
    .slice(0, 40)
    .map(([k, n]) => k + n)
    .join(" ")}`,
);
for (const [k, v] of Object.entries(issues)) {
  console.log(`ISSUE ${k}: ${v.length}\n   ${v.slice(0, 6).join("\n   ")}`);
}
