import { SLIDE_LIMITS } from "@/lib/teaching-content";
import { detectDelimiter, parseDelimited } from "@/lib/vocab-csv";

import type { TeachingVocab } from "@/lib/teaching-content";

export const MAX_PASTED_ROWS = 100;
export const MAX_PASTE_CHARACTERS = 50_000;

// Columns in the order teachers usually keep them in a spreadsheet.
export const TABLE_COLUMNS = [
  "Chữ Hán",
  "Pinyin",
  "Nghĩa tiếng Việt",
  "Câu ví dụ",
  "Pinyin câu ví dụ",
  "Nghĩa câu ví dụ",
] as const;

const HAN_TEXT = /\p{Script=Han}/u;
const HEADER_TEXT = /^(chữ hán|chu han|hán tự|han tu|từ|tu|hanzi|汉字|漢字)$/i;

export interface TableRow {
  line: number;
  text: string;
  reading: string;
  meaning: string;
  example: { text: string; reading: string; meaning: string } | null;
  status: "valid" | "invalid" | "duplicate";
  problems: string[];
  warnings: string[];
}

export interface TableParseResult {
  rows: TableRow[];
  error: string | null;
}

function describeProblems(row: Omit<TableRow, "status" | "problems" | "warnings">) {
  const problems: string[] = [];
  const warnings: string[] = [];
  if (!row.text || !row.meaning) {
    problems.push("Cần chữ Hán (cột 1) và nghĩa tiếng Việt (cột 3).");
  }
  if (row.text && !HAN_TEXT.test(row.text)) {
    problems.push("Cột 1 chưa có chữ Hán. Kiểm tra thứ tự cột.");
  }
  if (HAN_TEXT.test(row.reading)) {
    problems.push("Cột 2 là pinyin, không chứa chữ Hán.");
  }
  if (row.text.length > SLIDE_LIMITS.word || row.meaning.length > SLIDE_LIMITS.meaning) {
    problems.push("Nội dung quá dài cho một thẻ từ; tách thành các dòng ngắn.");
  }
  if (row.example && (!row.example.text || !row.example.meaning)) {
    problems.push("Câu ví dụ cần cả câu (cột 4) và nghĩa (cột 6).");
  }
  if (row.text && !row.reading) {
    warnings.push("Chưa có pinyin.");
  }
  return { problems, warnings };
}

// Parses rows pasted from Excel/Google Sheets (tab separated) or CSV. Nothing is written until
// the teacher confirms the preview; tones and simplified/traditional characters are kept as typed.
export function parseVocabularyTable(
  text: string,
  existing: readonly Pick<TeachingVocab, "text">[],
): TableParseResult {
  if (text.length > MAX_PASTE_CHARACTERS) {
    return {
      rows: [],
      error: "Nội dung dán quá dài. Chia thành nhiều lần, mỗi lần tối đa 100 dòng.",
    };
  }
  const normalized = text.normalize("NFC").replace(/^﻿/, "");
  const firstLine = normalized.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const records = parseDelimited(normalized, detectDelimiter(firstLine));
  const dataRecords =
    records[0] && HEADER_TEXT.test(records[0].fields[0]?.trim() ?? "") ? records.slice(1) : records;
  if (!dataRecords.length) {
    return { rows: [], error: "Chưa có dòng dữ liệu nào để thêm." };
  }
  if (dataRecords.length > MAX_PASTED_ROWS) {
    return { rows: [], error: `Mỗi lần dán tối đa ${MAX_PASTED_ROWS} dòng.` };
  }
  const seen = new Set(existing.map((item) => item.text));
  const rows = dataRecords.map((record): TableRow => {
    const [
      text = "",
      reading = "",
      meaning = "",
      exampleText = "",
      exampleReading = "",
      exampleMeaning = "",
    ] = record.fields.map((field) => field.trim());
    const hasExample = Boolean(exampleText || exampleReading || exampleMeaning);
    const values = {
      line: record.line,
      text,
      reading,
      meaning,
      example: hasExample
        ? { text: exampleText, reading: exampleReading, meaning: exampleMeaning }
        : null,
    };
    const { problems, warnings } = describeProblems(values);
    if (problems.length) {
      return { ...values, status: "invalid", problems, warnings };
    }
    if (seen.has(text)) {
      return {
        ...values,
        status: "duplicate",
        problems: ["Từ này đã có trong bài hoặc lặp lại ở dòng trên."],
        warnings,
      };
    }
    seen.add(text);
    return { ...values, status: "valid", problems, warnings };
  });
  return { rows, error: null };
}
