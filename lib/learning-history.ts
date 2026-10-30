import { z } from "zod";

const text = z.string().max(10000);
const count = z.number().int().min(0).max(100000).nullable();
const date = z.iso.date();
export const historyOutcomeSchema = z.enum([
  "correct",
  "incorrect",
  "unanswered",
  "ungraded",
  "excluded",
  "unknown",
]);

export const historySessionSchema = z
  .object({
    sourceRow: z.number().int().positive(),
    date,
    title: text,
    total: count,
    completed: count,
    correct: count,
    incorrect: count,
    unanswered: count,
    score: z.number().min(0).max(100).nullable(),
    scoreScale: z.union([z.literal(10), z.literal(100)]),
    gradedAtText: text,
  })
  .strict()
  .refine(
    (session) => session.score === null || session.score <= session.scoreScale,
    "A source score must stay within its original scale.",
  );

export const historyAnswerSchema = z
  .object({
    sourceRow: z.number().int().positive(),
    date,
    lesson: text,
    number: text,
    sourceId: text,
    kind: text,
    prompt: text,
    response: text,
    resultText: text,
    outcome: historyOutcomeSchema,
    note: text,
    gradedAtText: text,
  })
  .strict();

export const historyArchiveSchema = z
  .object({
    schemaVersion: z.literal(1),
    learnerName: z.string().min(1).max(100),
    course: z.string().min(1).max(100),
    languageTag: z.enum(["ja-JP", "zh-Hans", "zh-Hant"]),
    sourceLabel: z.string().min(1).max(300),
    sourceTabs: z
      .object({ summaries: z.string().min(1).max(100), answers: z.string().min(1).max(100) })
      .strict(),
    sessions: z.array(historySessionSchema).max(5000),
    answers: z.array(historyAnswerSchema).max(30000),
  })
  .strict()
  .superRefine((archive, context) => {
    for (const collection of [archive.sessions, archive.answers]) {
      const keys = collection.map((item) => item.sourceRow);
      if (new Set(keys).size !== keys.length) {
        context.addIssue({
          code: "custom",
          message: "Source rows must be unique within each tab.",
        });
      }
    }
  });

export type HistoryArchive = z.infer<typeof historyArchiveSchema>;
export type HistorySession = z.infer<typeof historySessionSchema>;
export type HistoryAnswer = z.infer<typeof historyAnswerSchema>;
export type HistoryOutcome = z.infer<typeof historyOutcomeSchema>;

export const HISTORY_OUTCOME_LABELS: Record<HistoryOutcome, string> = {
  correct: "Đúng",
  incorrect: "Sai",
  unanswered: "Chưa làm",
  ungraded: "Chưa chấm",
  excluded: "Không tính điểm",
  unknown: "Cần đối chiếu",
};

// A blank source score is not a zero; source grading is never recomputed on import.
export function parseHistoryNumber(value: unknown): number | null {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const normalized = String(value).trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error("Invalid source number.");
  }
  return Number(normalized);
}

export function classifyHistoryOutcome(result: string, response: string): HistoryOutcome {
  const value = result.trim().normalize("NFC").toLocaleLowerCase("vi");
  if (/^(ok|đúng)(?:$|\s|[—–-])/.test(value)) {
    return "correct";
  }
  if (/^(x|sai)(?:$|\s|[—–-])/.test(value)) {
    return "incorrect";
  }
  if (value.startsWith("chưa làm")) {
    return "unanswered";
  }
  if (value.startsWith("không tính")) {
    return "excluded";
  }
  if (!value) {
    return response.trim() ? "ungraded" : "unanswered";
  }
  if (value.startsWith("chưa chấm")) {
    return "ungraded";
  }
  return "unknown";
}

export function historyDates(archive: Pick<HistoryArchive, "sessions" | "answers">) {
  return [...new Set([...archive.sessions, ...archive.answers].map((item) => item.date))].sort(
    (first, second) => second.localeCompare(first),
  );
}

export function historyScoreLabel(session: HistorySession) {
  if (session.score === null) {
    return "Chưa có điểm";
  }
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(session.score)} / ${session.scoreScale}`;
}
