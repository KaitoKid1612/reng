import { randomBytes } from "node:crypto";

/**
 * A new lesson's ID: course, order and six random hex characters, such as `minna-1-18-a8e144`.
 * Lesson IDs are shared by every teacher and appear in links, so the suffix keeps them unique
 * while the rest stays readable. `public.new_lesson_id` in the database builds the same shape.
 */
export function readableLessonId(courseId: string, order: number, suffix = randomSuffix()) {
  const course =
    courseId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "lesson";
  return `${course}-${Math.max(1, Math.trunc(order) || 1)}-${suffix}`;
}

function randomSuffix() {
  return randomBytes(3).toString("hex");
}
