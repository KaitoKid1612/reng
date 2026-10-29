import { MAX_TABLE_COLUMNS, MAX_TABLE_ROWS } from "@/lib/lesson-schema";

export interface SlideTable {
  columns: string[];
  rows: string[][];
}

export type SlideTableResult = { table: SlideTable } | { error: string };

// Same caps as the draft schema, so a table accepted here always saves.
const MAX_HEADER_LENGTH = 80;
const MAX_CELL_LENGTH = 120;

function splitCells(line: string) {
  // Spreadsheet pastes use tabs; Tab moves focus in a textarea, so typed rows may use `|`.
  return line.split(line.includes("\t") ? "\t" : "|").map((cell) => cell.trim());
}

// The first non-empty line holds the column titles; blank lines are ignored.
export function parseSlideTable(text: string): SlideTableResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) {
    return { table: { columns: [], rows: [] } };
  }
  const [columns, ...rows] = lines.map(splitCells);
  if ([columns, ...rows].some((row) => row.length > MAX_TABLE_COLUMNS)) {
    return { error: `Bảng tối đa ${MAX_TABLE_COLUMNS} cột để đọc rõ trên slide.` };
  }
  if (rows.length > MAX_TABLE_ROWS) {
    return { error: `Bảng tối đa ${MAX_TABLE_ROWS} hàng; chia phần còn lại sang slide khác.` };
  }
  if (columns.some((cell) => cell.length > MAX_HEADER_LENGTH)) {
    return { error: `Tiêu đề cột tối đa ${MAX_HEADER_LENGTH} ký tự.` };
  }
  if (rows.some((row) => row.some((cell) => cell.length > MAX_CELL_LENGTH))) {
    return { error: `Mỗi ô tối đa ${MAX_CELL_LENGTH} ký tự.` };
  }
  return { table: { columns, rows } };
}

export function formatSlideTable({ columns, rows }: SlideTable) {
  return [columns, ...rows]
    .filter((row) => row.length)
    .map((row) => row.join("\t"))
    .join("\n");
}
