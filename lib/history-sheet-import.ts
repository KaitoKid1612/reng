import {
  classifyHistoryOutcome,
  historyArchiveSchema,
  parseHistoryNumber,
} from "@/lib/learning-history";

import type { HistoryAnswer, HistoryArchive, HistorySession } from "@/lib/learning-history";

interface SourceTab {
  rows: unknown[][];
}

function cell(row: unknown[], index: number) {
  const value = row[index];
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    throw new Error("Unexpected cell value.");
  }
  return String(value);
}

function dataRows(tab: SourceTab, headerIndex: number, expectedHeader: string[]) {
  const header = tab.rows[headerIndex];
  if (!header || expectedHeader.some((value, index) => cell(header, index) !== value)) {
    throw new Error("The source headers changed. Review the mapping before importing.");
  }
  return tab.rows.slice(headerIndex + 1).flatMap((row, index) => {
    if (
      row.every((value) => value === null || value === undefined || String(value).trim() === "")
    ) {
      return [];
    }
    return [{ row, sourceRow: index + headerIndex + 2 }];
  });
}

export function importHistorySheets(
  learner: "viet" | "nguyen",
  sessionsTab: SourceTab,
  answersTab: SourceTab,
): HistoryArchive {
  const isNguyen = learner === "nguyen";
  const sessions: HistorySession[] = dataRows(
    sessionsTab,
    0,
    isNguyen
      ? ["Ngày", "Phạm vi", "Số câu", "Đã làm", "Đúng", "Sai", "Điểm /10", "Thời gian chấm"]
      : ["Ngày", "Nội dung", "Tổng câu", "Đúng", "Sai", "Chưa làm", "Điểm %"],
  ).map(({ row, sourceRow }) => ({
    sourceRow,
    date: cell(row, 0),
    title: cell(row, 1),
    total: parseHistoryNumber(row[2]),
    completed: isNguyen ? parseHistoryNumber(row[3]) : null,
    correct: parseHistoryNumber(row[isNguyen ? 4 : 3]),
    incorrect: parseHistoryNumber(row[isNguyen ? 5 : 4]),
    unanswered: isNguyen ? null : parseHistoryNumber(row[5]),
    score: parseHistoryNumber(row[6]),
    scoreScale: isNguyen ? 10 : 100,
    gradedAtText: isNguyen ? cell(row, 7) : "",
  }));
  const answers: HistoryAnswer[] = dataRows(
    answersTab,
    isNguyen ? 2 : 0,
    isNguyen
      ? ["Ngày", "Phạm vi", "STT", "ID", "Dạng bài", "Câu hỏi", "Câu trả lời", "Kết quả", "Ghi chú"]
      : [
          "Ngày",
          "Bài",
          "Câu",
          "Dạng bài",
          "Câu hỏi",
          "Câu trả lời của học sinh",
          "Kết quả",
          "Chấm lúc",
        ],
  ).map(({ row, sourceRow }) => {
    const response = cell(row, isNguyen ? 6 : 5);
    const resultText = cell(row, isNguyen ? 7 : 6);
    return {
      sourceRow,
      date: cell(row, 0),
      lesson: cell(row, 1),
      number: cell(row, 2),
      sourceId: isNguyen ? cell(row, 3) : "",
      kind: cell(row, isNguyen ? 4 : 3),
      prompt: cell(row, isNguyen ? 5 : 4),
      response,
      resultText,
      outcome: classifyHistoryOutcome(resultText, response),
      note: isNguyen ? cell(row, 8) : "",
      gradedAtText: isNguyen ? "" : cell(row, 7),
    };
  });
  return historyArchiveSchema.parse({
    schemaVersion: 1,
    learnerName: isNguyen ? "Nguyên" : "Việt",
    course: isNguyen ? "JLPT N5" : "JLPT N4",
    languageTag: "ja-JP",
    sourceLabel: "Google Sheet — bản lưu trước khi chuyển sang Reng",
    sourceTabs: {
      summaries: isNguyen ? "Tong_hop_ngay" : "Ket_qua",
      answers: isNguyen ? "Lich_su_bai" : "Bai_hang_ngay",
    },
    sessions,
    answers,
  });
}
