export const MAX_CSV_ROWS = 300;
export const MAX_CSV_BYTES = 200 * 1024;

export const VOCAB_COLUMNS = ["jp", "kanji", "romaji", "vi", "note"] as const;

type VocabColumn = (typeof VOCAB_COLUMNS)[number];

const REQUIRED_COLUMNS: readonly VocabColumn[] = ["jp", "romaji", "vi"];

// Headers are matched without case or Vietnamese diacritics, so "Nghĩa" and "nghia" both work.
const HEADER_ALIASES: Record<string, VocabColumn> = {
  jp: "jp",
  kana: "jp",
  hiragana: "jp",
  "cach doc": "jp",
  "tieng nhat": "jp",
  kanji: "kanji",
  "han tu": "kanji",
  romaji: "romaji",
  vi: "vi",
  nghia: "vi",
  "tieng viet": "vi",
  "nghia tieng viet": "vi",
  note: "note",
  "ghi chu": "note",
};

const KANA_TEXT = /^[\p{Script=Hiragana}\p{Script=Katakana}ー〜～・\s]+$/u;
const ROMAJI_TEXT = /^[A-Za-zāīūēōĀĪŪĒŌ\s'-]+$/;
const LIMITS: Record<VocabColumn, number> = {
  jp: 100,
  kanji: 100,
  romaji: 100,
  vi: 200,
  note: 500,
};

export type VocabValues = Record<VocabColumn, string>;

export interface CsvRow {
  line: number;
  values: VocabValues;
  status: "valid" | "invalid" | "duplicate";
  problems: string[];
}

export interface CsvParseResult {
  rows: CsvRow[];
  error: string | null;
}

function foldHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function detectDelimiter(headerLine: string) {
  if (headerLine.includes("\t")) {
    return "\t";
  }
  const semicolons = headerLine.split(";").length;
  return semicolons > headerLine.split(",").length ? ";" : ",";
}

interface ParsedRecord {
  line: number;
  fields: string[];
}

// RFC 4180: quoted fields may contain delimiters, doubled quotes and line breaks.
export function parseDelimited(text: string, delimiter: string): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  let fields: string[] = [];
  let field = "";
  let isQuoted = false;
  let line = 1;
  let recordLine = 1;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (isQuoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (character === '"') {
        isQuoted = false;
      } else {
        if (character === "\n") {
          line++;
        }
        field += character;
      }
      continue;
    }
    if (character === '"' && field === "") {
      isQuoted = true;
    } else if (character === delimiter) {
      fields.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") {
        index++;
      }
      fields.push(field);
      records.push({ line: recordLine, fields });
      fields = [];
      field = "";
      line++;
      recordLine = line;
    } else {
      field += character;
    }
  }
  if (field !== "" || fields.length) {
    fields.push(field);
    records.push({ line: recordLine, fields });
  }
  return records.filter((record) => record.fields.some((value) => value.trim() !== ""));
}

function duplicateKey(values: Pick<VocabValues, "jp" | "vi">) {
  return `${values.jp.normalize("NFKC").replace(/\s+/g, "")}|${values.vi.trim().toLowerCase()}`;
}

function describeRowProblems(values: VocabValues) {
  const problems: string[] = [];
  if (!values.jp) {
    problems.push("thiếu cách đọc kana (jp)");
  } else if (!KANA_TEXT.test(values.jp)) {
    problems.push("jp chỉ gồm hiragana/katakana; kanji đặt ở cột kanji");
  }
  if (!values.romaji) {
    problems.push("thiếu romaji");
  } else if (!ROMAJI_TEXT.test(values.romaji)) {
    problems.push("romaji chỉ gồm chữ Latin");
  }
  if (!values.vi) {
    problems.push("thiếu nghĩa tiếng Việt");
  }
  for (const column of VOCAB_COLUMNS) {
    if (values[column].length > LIMITS[column]) {
      problems.push(`${column} dài quá ${LIMITS[column]} ký tự`);
    }
  }
  return problems;
}

export function parseVocabularyCsv(
  text: string,
  existing: readonly Pick<VocabValues, "jp" | "vi">[],
): CsvParseResult {
  const content = text.replace(/^﻿/, "");
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const [header, ...records] = parseDelimited(content, detectDelimiter(firstLine));
  if (!header) {
    return {
      rows: [],
      error: "Chưa có dữ liệu. Dòng đầu là tên cột: jp, kanji, romaji, vi, note.",
    };
  }
  const columns = header.fields.map((name) => HEADER_ALIASES[foldHeader(name)] ?? null);
  const missing = REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
  if (missing.length) {
    return {
      rows: [],
      error: `Thiếu cột ${missing.join(", ")}. Dòng đầu cần có jp, romaji, vi (kanji, note tùy chọn).`,
    };
  }
  if (records.length > MAX_CSV_ROWS) {
    return { rows: [], error: `Tối đa ${MAX_CSV_ROWS} dòng mỗi lần nhập.` };
  }
  const seen = new Set(existing.map(duplicateKey));
  const rows = records.map((record): CsvRow => {
    const values: VocabValues = { jp: "", kanji: "", romaji: "", vi: "", note: "" };
    columns.forEach((column, index) => {
      if (column) {
        values[column] = (record.fields[index] ?? "").trim();
      }
    });
    const problems = describeRowProblems(values);
    if (problems.length) {
      return { line: record.line, values, status: "invalid", problems };
    }
    const key = duplicateKey(values);
    if (seen.has(key)) {
      return { line: record.line, values, status: "duplicate", problems: ["đã có trong bài"] };
    }
    seen.add(key);
    return { line: record.line, values, status: "valid", problems: [] };
  });
  return { rows, error: null };
}

export function decodeCsvFile(bytes: ArrayBuffer) {
  if (bytes.byteLength > MAX_CSV_BYTES) {
    throw new Error("too_large");
  }
  // Excel's legacy "CSV" uses a Windows code page that loses Vietnamese and Japanese text.
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export const CSV_TEMPLATE = "jp,kanji,romaji,vi,note\nいきます,行きます,ikimasu,đi,\n";
