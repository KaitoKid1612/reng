import { z } from "zod";

export const classSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  passScore: z.coerce.number().int().min(0).max(100),
  capacity: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().int().min(1).max(1000).nullable(),
  ),
  meetingUrl: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().replace(/\/$/, "") : value),
    z.union([
      z.literal(""),
      z.string().regex(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/),
    ]),
  ),
  languageTag: z.enum(["ja-JP", "zh-Hans", "zh-Hant"]),
});

export type ClassSettings = z.infer<typeof classSettingsSchema>;

export function subjectForLanguage(languageTag: ClassSettings["languageTag"]) {
  return languageTag === "ja-JP" ? "japanese" : "chinese";
}
