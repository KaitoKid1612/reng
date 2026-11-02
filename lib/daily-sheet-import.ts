import { z } from "zod";

import { parseAssignableQuestion } from "@/lib/assignment";
import { lessonDraftSchema } from "@/lib/lesson-schema";

interface DailySheetSource {
  today: unknown[][];
  history: unknown[][];
  keys: unknown[][];
}

function cell(row: unknown[], index: number) {
  const value = row[index];
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error("Unexpected source cell.");
  }
  return String(value).trim();
}

function checkHeader(rows: unknown[][], index: number, header: string[]) {
  if (header.some((value, column) => cell(rows[index] ?? [], column) !== value)) {
    throw new Error("Source headers changed; review the import mapping.");
  }
}

// Slash/pipe/newline alternatives are explicit in this source. Semicolons and middle dots
// join required items; never split them into individually acceptable partial answers.
function acceptedAnswers(standard: string, extra: string) {
  const originals = [standard, extra].filter(Boolean);
  const variants = originals.flatMap((answer) => [
    answer,
    ...answer.split(/\s+\/\s+|\s*\|\s*|\n/).filter(Boolean),
  ]);
  return [
    ...new Set(
      variants.flatMap((answer) => [
        answer,
        answer.replace(/[・;]/g, "、"),
        answer.replace(/[・;]/g, " "),
        answer.replace(/[・;]/g, ""),
      ]),
    ),
  ];
}

// Each JLPT level gets its own bank lesson; a teacher's sheet for one level keeps the same id
// so a second import is refused instead of creating a duplicate bank.
export const SHEET_BANKS = {
  N5: {
    id: "n5-sheet-review-bank",
    title: "Ngân hàng ôn JLPT N5 — Minna Bài 1–10",
    titleJa: "日本語 N5 復習",
    courseId: "n5",
    slideTitle: "Ôn tập Bài 1–10",
  },
  N4: {
    id: "n4-sheet-review-bank",
    title: "Ngân hàng ôn JLPT N4",
    titleJa: "日本語 N4 復習",
    courseId: "n4",
    slideTitle: "Ôn tập JLPT N4",
  },
} as const;

export type SheetLevel = keyof typeof SHEET_BANKS;

export interface DailySheetOptions {
  level: SheetLevel;
  // Builds only the bank, for a sheet whose day is already done or partly answered.
  bankOnly?: boolean;
  // Lesson IDs are global, so each class gets its own bank lesson; defaults to the level's ID.
  bankId?: string;
}

// Sheets are typed by hand; "T-12" and "t-12" are the same question.
function sourceId(row: unknown[], index: number) {
  return cell(row, index).toLowerCase();
}

function readToday(source: DailySheetSource) {
  const date = z.iso.date().parse(cell(source.today[1] ?? [], 1));
  const dueTime = z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .parse(cell(source.today[3] ?? [], 1));
  const dueAt = z.iso.datetime({ offset: true }).parse(`${date}T${dueTime}:00+07:00`);
  return { date, dueAt };
}

export function importDailySheet(
  source: DailySheetSource,
  { level, bankOnly = false, bankId }: DailySheetOptions = { level: "N5" },
) {
  checkHeader(source.today, 5, [
    "STT",
    "Dạng bài",
    "Câu hỏi",
    "Câu trả lời",
    "Kết quả",
    "Ghi chú",
    "ID",
  ]);
  checkHeader(source.history, 2, [
    "Ngày",
    "Phạm vi",
    "STT",
    "ID",
    "Dạng bài",
    "Câu hỏi",
    "Câu trả lời",
    "Kết quả",
    "Ghi chú",
  ]);
  checkHeader(source.keys, 2, ["ID", "Bài", "Đáp án chuẩn", "Chấp nhận thêm"]);
  const keys = new Map<string, { standard: string; extra: string }>();
  for (const row of source.keys.slice(3)) {
    const id = sourceId(row, 0);
    if (!id) {
      continue;
    }
    const value = { standard: cell(row, 2), extra: cell(row, 3) };
    const previous = keys.get(id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(value)) {
      throw new Error("Conflicting answer keys need teacher review.");
    }
    keys.set(id, value);
  }
  const candidates = new Map<string, { id: string; kind: string; prompt: string }>();
  const todayIds: string[] = [];
  for (const row of source.today.slice(6)) {
    const id = sourceId(row, 6);
    if (!id) {
      continue;
    }
    if (candidates.has(id)) {
      throw new Error("Today's source IDs must be unique.");
    }
    if (bankOnly) {
      // Without today's assignment, a row only joins the bank when it has an answer key.
      if (keys.get(id)?.standard) {
        candidates.set(id, { id, kind: cell(row, 1), prompt: cell(row, 2) });
      }
      continue;
    }
    if (cell(row, 3) || cell(row, 4) || cell(row, 5)) {
      throw new Error(
        "Today's sheet already has work; reconcile it before creating a new attempt.",
      );
    }
    candidates.set(id, { id, kind: cell(row, 1), prompt: cell(row, 2) });
    todayIds.push(id);
  }
  if (
    !bankOnly &&
    (todayIds.length !== Number(cell(source.today[1] ?? [], 8)) || todayIds.length !== 60)
  ) {
    throw new Error("Expected the complete daily set of 60 questions.");
  }
  // Keep the lesson editable within the existing editor's 200-question limit. Prioritize
  // today's complete set, then the most recent history rows that have a source answer key.
  for (const row of [...source.history.slice(3)].reverse()) {
    const id = sourceId(row, 3);
    if (candidates.size >= 200) {
      break;
    }
    if (!id || candidates.has(id) || !keys.get(id)?.standard) {
      continue;
    }
    candidates.set(id, { id, kind: cell(row, 4), prompt: cell(row, 5) });
  }
  if (!candidates.size) {
    throw new Error("The sheet has no question with an approved answer key.");
  }
  const questions = [...candidates.values()].map((item) => {
    const key = keys.get(item.id);
    if (!key?.standard) {
      throw new Error("A daily question has no approved source answer key.");
    }
    const answers = acceptedAnswers(key.standard, key.extra);
    const isVietnamese = !answers.some((answer) =>
      /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(answer),
    );
    return parseAssignableQuestion({
      id: item.id,
      type: "fill",
      prompt: item.prompt,
      points: 1,
      tags: [item.kind],
      explain:
        "Đáp án lấy từ ngân hàng của giáo viên. Hệ thống đối chiếu các dạng đã khai báo; cách diễn đạt khác cần giáo viên xem lại.",
      inputMode: isVietnamese ? "text" : "japanese",
      kanjiStrict: /viết kanji/i.test(item.prompt),
      answer: answers,
    });
  });
  const bank = SHEET_BANKS[level];
  const draft = lessonDraftSchema.parse({
    id: bankId ?? bank.id,
    title: bank.title,
    titleJa: bank.titleJa,
    summary:
      "Ngân hàng có đáp án từ Sheet của giáo viên; gồm bài ngày chuyển đổi và các câu ôn gần nhất. Không có audio.",
    order: 1,
    courseId: bank.courseId,
    isSample: false,
    content: {
      schemaVersion: 1,
      vocab: [],
      grammar: [],
      slides: [
        {
          id: "review-intro",
          type: "note",
          title: bank.slideTitle,
          body: "Làm bài trong mục Bài tập của lớp. Chấm theo các đáp án đã khai báo; đáp án mở có thể cần giáo viên kiểm tra thêm.",
        },
      ],
      questions,
    },
  });
  const today = bankOnly ? null : { ...readToday(source), ids: todayIds };
  return { today, draft };
}
