import { parseSnapshotQuestion } from "@/lib/assignment";
import { stripFuriganaMarks, tidyFurigana } from "@/lib/japanese-text";
import { findFuriganaProblems } from "@/lib/lesson-draft";

// A display fix changes how a question that was already given reads, never what is graded.
// The prompt and explanation may be rewritten; the passage, options, order pieces and transcript
// may only gain or lose furigana. Migration 20261105044634 (is_display_fix) enforces the same
// rule in the database, so these checks only explain a refusal before it reaches it.

export interface DisplayFix {
  prompt: string;
  explain: string;
  passage?: string;
  options?: readonly string[];
  /** The order pieces' texts, in the snapshot's token order. */
  tokens?: readonly string[];
  transcript?: string;
}

type Snapshot = Record<string, unknown>;

const EDITABLE_KEYS = ["prompt", "explain", "passage", "options", "tokens", "transcript"];
const MAX_PROMPT = 500;
const MAX_EXPLAIN = 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Key order does not matter in jsonb, so values are compared with sorted keys.
export function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

export const sameJson = (first: unknown, second: unknown) =>
  JSON.stringify(canonical(first)) === JSON.stringify(canonical(second));

function withoutKeys(snapshot: Snapshot, keys: readonly string[]) {
  return Object.fromEntries(Object.entries(snapshot).filter(([key]) => !keys.includes(key)));
}

// Fields the teacher left alone keep their stored text exactly; edited ones get tidy marks.
function edited(previous: unknown, next: string | undefined) {
  if (typeof previous !== "string" || next === undefined || next === previous) {
    return previous;
  }
  return tidyFurigana(next);
}

/** The snapshot with the teacher's text in place; graded fields are copied, never taken from the form. */
export function applyDisplayFix(snapshot: Snapshot, fix: DisplayFix): Snapshot {
  const next: Snapshot = { ...snapshot };
  next.prompt = edited(snapshot.prompt, fix.prompt.trim());
  next.explain = edited(snapshot.explain, fix.explain.trim());
  if ("passage" in snapshot) {
    next.passage = edited(snapshot.passage, fix.passage);
  }
  if ("transcript" in snapshot) {
    next.transcript = edited(snapshot.transcript, fix.transcript);
  }
  const { options, tokens } = snapshot;
  if (Array.isArray(options) && fix.options) {
    next.options = options.map((option, index) => edited(option, fix.options?.[index]));
  }
  if (Array.isArray(tokens) && fix.tokens) {
    next.tokens = tokens.map((token, index) =>
      isRecord(token) ? { ...token, text: edited(token.text, fix.tokens?.[index]) } : token,
    );
  }
  return next;
}

const sameWithoutFurigana = (first: unknown, second: unknown) =>
  typeof first === "string" && typeof second === "string"
    ? stripFuriganaMarks(first) === stripFuriganaMarks(second)
    : sameJson(first, second);

function onlyFuriganaChanged(before: Snapshot, after: Snapshot) {
  if (!sameWithoutFurigana(before.passage, after.passage)) {
    return false;
  }
  if (!sameWithoutFurigana(before.transcript, after.transcript)) {
    return false;
  }
  for (const key of ["options", "tokens"] as const) {
    const old = before[key];
    const next = after[key];
    if (!Array.isArray(old) || !Array.isArray(next)) {
      if (!sameJson(old, next)) {
        return false;
      }
      continue;
    }
    if (old.length !== next.length) {
      return false;
    }
    const same = old.every((item, index) => {
      const nextItem: unknown = next[index];
      if (key === "options") {
        return sameWithoutFurigana(item, nextItem);
      }
      return (
        isRecord(item) &&
        isRecord(nextItem) &&
        sameJson(withoutKeys(item, ["text"]), withoutKeys(nextItem, ["text"])) &&
        sameWithoutFurigana(item.text, nextItem.text)
      );
    });
    if (!same) {
      return false;
    }
  }
  return true;
}

/** Why a display fix cannot be saved, in Vietnamese, or null when it can. */
export function describeDisplayFixProblem(before: Snapshot, after: Snapshot) {
  if (!sameJson(withoutKeys(before, EDITABLE_KEYS), withoutKeys(after, EDITABLE_KEYS))) {
    return "Chỉ sửa được đề bài, giải thích và furigana; đáp án, lựa chọn và thứ tự câu giữ nguyên.";
  }
  if (!onlyFuriganaChanged(before, after)) {
    return "Lựa chọn, mảnh câu, đoạn văn và lời nghe chỉ được thêm hoặc bỏ furigana {漢字|かんじ}, không đổi chữ.";
  }
  const prompt = typeof after.prompt === "string" ? after.prompt : "";
  const explain = typeof after.explain === "string" ? after.explain : "";
  if (!prompt.trim() || !explain.trim()) {
    return "Đề bài và giải thích không được để trống.";
  }
  if (prompt.length > MAX_PROMPT || explain.length > MAX_EXPLAIN) {
    return `Đề bài tối đa ${MAX_PROMPT} ký tự, giải thích tối đa ${MAX_EXPLAIN} ký tự.`;
  }
  let question;
  try {
    question = parseSnapshotQuestion(after);
  } catch {
    return "Câu sau khi sửa không còn hợp lệ; tải lại trang rồi sửa lại.";
  }
  const [problem] = findFuriganaProblems([question]);
  return problem ? problem.message.replace(/^Câu luyện \d+: /, "Furigana: ") : null;
}

/** The form's starting text for each field a display fix may touch. */
export function toDisplayFix(snapshot: Snapshot): DisplayFix {
  const text = (value: unknown) => (typeof value === "string" ? value : undefined);
  const { options, tokens } = snapshot;
  return {
    prompt: text(snapshot.prompt) ?? "",
    explain: text(snapshot.explain) ?? "",
    passage: text(snapshot.passage),
    transcript: text(snapshot.transcript),
    options: Array.isArray(options)
      ? options.filter((option): option is string => typeof option === "string")
      : undefined,
    tokens: Array.isArray(tokens)
      ? tokens.map((token) => (isRecord(token) && typeof token.text === "string" ? token.text : ""))
      : undefined,
  };
}
