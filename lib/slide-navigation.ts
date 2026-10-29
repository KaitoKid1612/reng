import { z } from "zod";

export function parseSlideHash(hash: string, count: number) {
  if (!hash) {
    return { index: 0, isValid: true };
  }
  const number = /^#[1-9]\d*$/.test(hash) ? Number(hash.slice(1)) : NaN;
  return Number.isSafeInteger(number) && number <= count
    ? { index: number - 1, isValid: true }
    : { index: 0, isValid: false };
}

export const slideMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("request") }).strict(),
  z.object({ type: z.literal("command"), command: z.enum(["next", "prev"]) }).strict(),
  z
    .object({
      type: z.literal("position"),
      index: z.number().int().nonnegative(),
      fragment: z.number().int().min(-1).max(100),
    })
    .strict(),
]);

export function slideChannelName(lessonId: string, versionId: string) {
  return `reng-slides:${lessonId}:${versionId}`;
}
