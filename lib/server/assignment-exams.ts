import "server-only";

import { z } from "zod";

import { JLPT_LEVELS } from "@/lib/jlpt";
import { createServiceClient, describeServiceFailure, selectRowsIn } from "@/lib/server/supabase";

import type { JlptLevel } from "@/lib/jlpt";

export interface AssignmentExam {
  level: JlptLevel;
  timeLimitMinutes: number;
}

const examRowSchema = z.object({
  assignment_id: z.uuid(),
  level: z.enum(JLPT_LEVELS),
  time_limit_minutes: z.number().int().positive(),
});

/**
 * The mock exam settings of these assignments. Before migration 20261109032029 the table is
 * missing; no assignment is a mock exam then and every page keeps working.
 */
export async function listAssignmentExams(assignmentIds: readonly string[]) {
  const exams = new Map<string, AssignmentExam>();
  if (!assignmentIds.length) {
    return exams;
  }
  try {
    const rows = await selectRowsIn(
      assignmentIds,
      (chunk) =>
        createServiceClient()
          .from("assignment_exams")
          .select("assignment_id, level, time_limit_minutes")
          .in("assignment_id", chunk),
      examRowSchema,
    );
    for (const row of rows) {
      exams.set(row.assignment_id, { level: row.level, timeLimitMinutes: row.time_limit_minutes });
    }
  } catch (error) {
    console.error("Assignment exams unavailable", describeServiceFailure(error));
  }
  return exams;
}
