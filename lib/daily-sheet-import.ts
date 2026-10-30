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

export function importDailySheet(source: DailySheetSource) {
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
  const date = z.iso.date().parse(cell(source.today[1] ?? [], 1));
  const dueTime = z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .parse(cell(source.today[3] ?? [], 1));
  const dueAt = z.iso.datetime({ offset: true }).parse(`${date}T${dueTime}:00+07:00`);
  const keys = new Map<string, { standard: string; extra: string }>();
  for (const row of source.keys.slice(3)) {
    const id = cell(row, 0);
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
    const id = cell(row, 6);
    if (!id) {
      continue;
    }
    if (cell(row, 3) || cell(row, 4) || cell(row, 5)) {
      throw new Error(
        "Today's sheet already has work; reconcile it before creating a new attempt.",
      );
    }
    if (candidates.has(id)) {
      throw new Error("Today's source IDs must be unique.");
    }
    candidates.set(id, { id, kind: cell(row, 1), prompt: cell(row, 2) });
    todayIds.push(id.toLowerCase());
  }
  if (todayIds.length !== Number(cell(source.today[1] ?? [], 8)) || todayIds.length !== 60) {
    throw new Error("Expected the complete daily set of 60 questions.");
  }
  // Keep the lesson editable within the existing editor's 200-question limit. Prioritize
  // today's complete set, then the most recent history rows that have a source answer key.
  for (const row of [...source.history.slice(3)].reverse()) {
    const id = cell(row, 3);
    if (candidates.size >= 200) {
      break;
    }
    if (!id || candidates.has(id) || !keys.get(id)?.standard) {
      continue;
    }
    candidates.set(id, { id, kind: cell(row, 4), prompt: cell(row, 5) });
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
      id: item.id.toLowerCase(),
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
  const draft = lessonDraftSchema.parse({
    id: "n5-sheet-review-bank",
    title: "Ngân hàng ôn JLPT N5 — Minna Bài 1–10",
    titleJa: "日本語 N5 復習",
    summary:
      "Ngân hàng có đáp án từ Sheet của giáo viên; gồm bài ngày chuyển đổi và các câu ôn gần nhất. Không có audio.",
    order: 1,
    courseId: "n5",
    isSample: false,
    content: {
      schemaVersion: 1,
      vocab: [],
      grammar: [],
      slides: [
        {
          id: "review-intro",
          type: "note",
          title: "Ôn tập Bài 1–10",
          body: "Làm bài trong mục Bài tập của lớp. Chấm theo các đáp án đã khai báo; đáp án mở có thể cần giáo viên kiểm tra thêm.",
        },
      ],
      questions,
    },
  });
  return { date, dueAt, todayIds, draft };
}
