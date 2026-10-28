import { z } from "zod";

export const KANA_SCRIPTS = ["hiragana", "katakana"] as const;
export const KANA_GROUPS = ["basic", "dakuten", "handakuten", "yoon"] as const;
export type KanaScript = (typeof KANA_SCRIPTS)[number];
export type KanaGroup = (typeof KANA_GROUPS)[number];
export const KANA_GROUP_LABELS: Record<KanaGroup, string> = {
  basic: "Âm cơ bản",
  dakuten: "Âm đục",
  handakuten: "Âm nửa đục",
  yoon: "Âm ghép",
};

const itemSchema = z
  .object({
    id: z.string().regex(/^[hk]-[a-z]+$/),
    script: z.enum(KANA_SCRIPTS),
    group: z.enum(KANA_GROUPS),
    row: z.number().int().min(0),
    column: z.number().int().min(0).max(4),
    kana: z.string().min(1).max(2),
    acceptedRomaji: z.array(z.string().regex(/^[a-z]+(?:')?$/)).min(1),
    audio: z.null(),
    strokes: z.array(z.string()),
  })
  .strict();

export const kanaSchema = z
  .object({
    schemaVersion: z.literal(1),
    items: z.array(itemSchema).length(208),
  })
  .strict()
  .superRefine(({ items }, ctx) => {
    const ids = new Set<string>();
    const coordinates = new Set<string>();
    const characters = new Set<string>();
    for (const [index, item] of items.entries()) {
      const coordinate = `${item.script}/${item.group}/${item.row}/${item.column}`;
      const errors: string[] = [];
      if (ids.has(item.id)) {
        errors.push("Duplicate kana ID");
      }
      if (coordinates.has(coordinate)) {
        errors.push("Duplicate grid position");
      }
      if (characters.has(item.kana)) {
        errors.push("Duplicate kana character");
      }
      const isHiragana = item.script === "hiragana";
      if (!(isHiragana ? /^[ぁ-ゖ]+$/u : /^[ァ-ヶ]+$/u).test(item.kana)) {
        errors.push("Character does not match its script");
      }
      if (!item.id.startsWith(isHiragana ? "h-" : "k-")) {
        errors.push("ID prefix does not match its script");
      }
      if (item.group === "yoon" && item.column > 2) {
        errors.push("Contracted sounds must use three columns");
      }
      if (new Set(item.acceptedRomaji).size !== item.acceptedRomaji.length) {
        errors.push("Duplicate accepted romaji");
      }
      errors.forEach((message) =>
        ctx.addIssue({ code: "custom", path: ["items", index], message }),
      );
      ids.add(item.id);
      coordinates.add(coordinate);
      characters.add(item.kana);
    }
    const expected = { basic: 46, dakuten: 20, handakuten: 5, yoon: 33 };
    for (const script of KANA_SCRIPTS) {
      for (const group of KANA_GROUPS) {
        if (
          items.filter((item) => item.script === script && item.group === group).length !==
          expected[group]
        ) {
          ctx.addIssue({
            code: "custom",
            message: `Unexpected item count for ${script}/${group}`,
          });
        }
      }
    }
  });

export const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    assets: z.record(z.string(), z.string().regex(/^[a-f0-9]{32}$/)),
  })
  .strict();
export type KanaItem = z.infer<typeof itemSchema>;
export function normalizeRomaji(raw: string) {
  return raw.normalize("NFKC").toLowerCase().trim();
}
export function isCorrect(item: KanaItem, raw: string) {
  return item.acceptedRomaji.includes(normalizeRomaji(raw));
}

export function createSession(
  items: KanaItem[],
  count: number,
  random: () => number = Math.random,
): KanaItem[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, Math.max(0, Math.min(count, result.length)));
}

export interface PracticeRecord {
  itemId: string;
  raw: string;
  correct: boolean;
}
export interface PracticeState {
  phase: "idle" | "answering" | "feedback" | "result";
  items: KanaItem[];
  index: number;
  records: PracticeRecord[];
}
export const initialPractice: PracticeState = {
  phase: "idle",
  items: [],
  index: 0,
  records: [],
};
export type PracticeAction =
  | { type: "start"; items: KanaItem[] }
  | { type: "submit"; raw: string }
  | { type: "next" }
  | { type: "reset" };
export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case "start":
      return action.items.length
        ? { phase: "answering", items: action.items, index: 0, records: [] }
        : initialPractice;
    case "reset":
      return initialPractice;
    case "submit": {
      if (state.phase !== "answering" || !normalizeRomaji(action.raw)) {
        return state;
      }
      const item = state.items[state.index];
      return {
        ...state,
        phase: "feedback",
        records: [
          ...state.records,
          {
            itemId: item.id,
            raw: action.raw,
            correct: isCorrect(item, action.raw),
          },
        ],
      };
    }
    case "next":
      if (state.phase !== "feedback") {
        return state;
      }
      return state.index + 1 === state.items.length
        ? { ...state, phase: "result" }
        : { ...state, phase: "answering", index: state.index + 1 };
  }
}

export interface PracticeMistake {
  item: KanaItem;
  raw: string;
}

export function getPracticeMistakes(state: PracticeState): PracticeMistake[] {
  return state.records
    .filter((record) => !record.correct)
    .map((record) => {
      const item = state.items.find((sessionItem) => sessionItem.id === record.itemId);

      if (!item) {
        throw new Error(`Practice record refers to a missing item: ${record.itemId}`);
      }

      return { item, raw: record.raw };
    });
}
