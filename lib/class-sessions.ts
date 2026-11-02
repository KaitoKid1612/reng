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

// Presenter links count slides from 1, the same as the number the teacher writes down. Opened
// from a class, the slides carry the class so the teacher can log the session from them.
export function slidePresenterPath(
  lessonId: string,
  versionId: string,
  slide: number,
  classId?: string,
) {
  const classQuery = classId ? `&class=${classId}` : "";
  return `/lessons/${lessonId}/slide?version=${versionId}${classQuery}#${slide}`;
}

// Back from the slides, the teaching log opens with the lesson and the slide on screen filled in.
export function sessionLogPath(classId: string, lessonId: string, slide: number) {
  const query = new URLSearchParams({ lesson: lessonId, slide: String(slide) });
  return `/teach/classes/${classId}?${query.toString()}#class-sessions`;
}

const prefillSchema = z.object({
  lesson: z.string().max(100).optional().catch(undefined),
  slide: z.coerce.number().int().min(1).max(MAX_SLIDE_NUMBER).optional().catch(undefined),
});

// Only a lesson of this class is preselected; a stray or edited query just leaves the defaults.
export function parseSessionPrefill(query: unknown, classLessonIds: readonly string[]) {
  const parsed = prefillSchema.safeParse(query);
  if (!parsed.success || !parsed.data.lesson || !classLessonIds.includes(parsed.data.lesson)) {
    return null;
  }
  return { lessonId: parsed.data.lesson, slide: parsed.data.slide ?? null };
}
