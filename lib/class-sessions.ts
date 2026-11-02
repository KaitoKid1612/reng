import { z } from "zod";

export const MAX_SESSION_NOTES = 2000;
export const MAX_SLIDE_NUMBER = 500;

// Form fields arrive as strings; an empty lesson or slide means the session did not use one. A
// slide number only makes sense together with the lesson it belongs to.
export const classSessionInputSchema = z
  .object({
    classId: z.uuid(),
    taughtOn: z.iso.date(),
    lessonId: z
      .string()
      .max(100)
      .transform((value) => value || null),
    slideReached: z.preprocess(
      (value) => (value === "" ? null : value),
      z.coerce.number().int().min(1).max(MAX_SLIDE_NUMBER).nullable(),
    ),
    notes: z.string().trim().max(MAX_SESSION_NOTES),
  })
  .refine((input) => input.slideReached === null || input.lessonId !== null, {
    path: ["slideReached"],
  });

export type ClassSessionInput = z.infer<typeof classSessionInputSchema>;

// The log records sessions that took place; a later date is a typo, not a plan.
export function isFutureSession(taughtOn: string, today: string) {
  return taughtOn > today;
}

// Presenter links count slides from 1, the same as the number the teacher writes down.
export function slidePresenterPath(lessonId: string, versionId: string, slide: number) {
  return `/lessons/${lessonId}/slide?version=${versionId}#${slide}`;
}
