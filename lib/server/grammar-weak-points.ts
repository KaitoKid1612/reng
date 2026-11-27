import "server-only";

import { z } from "zod";

import { FEEDBACK_POLICIES, isFeedbackAvailable } from "@/lib/assignment";
import { WEAK_GRAMMAR_DAYS } from "@/lib/grammar-weak-points";
import { createServiceClient, selectEveryPage, selectRowsIn } from "@/lib/server/supabase";

import type { GrammarAnswer } from "@/lib/grammar-weak-points";

const timestamp = z.iso.datetime({ offset: true });
// A daily set a day for a month, with room for other work.
const MAX_SUBMISSIONS = 120;
const BATCH = 10;

function inBatches(values: readonly string[]) {
  const batches: string[][] = [];
  for (let start = 0; start < values.length; start += BATCH) {
    batches.push(values.slice(start, start + BATCH));
  }
  return batches;
}

// A learner's answers in one class over the last month, keeping the questions whose tags pass
// `keep` (grammar points, the lesson tags of the course map, or both in one read). Only attempts
// whose results the learner may already see count, as on the progress page.
export async function listClassTaggedAnswers(
  userId: string,
  classId: string,
  now: Date,
  keep: (tags: readonly string[]) => boolean,
): Promise<GrammarAnswer[]> {
  const service = createServiceClient();
  const since = new Date(now.getTime() - WEAK_GRAMMAR_DAYS * 86_400_000).toISOString();
  const submissions = await selectEveryPage(
    (from, to) =>
      service
        .from("submissions")
        .select("id, assignment_id, submitted_at")
        .eq("user_id", userId)
        .eq("status", "submitted")
        .gte("submitted_at", since)
        .order("submitted_at", { ascending: false })
        .order("id")
        .range(from, to),
    z.object({ id: z.uuid(), assignment_id: z.uuid(), submitted_at: timestamp }),
  );
  if (!submissions.length) {
    return [];
  }
  const rules = await selectRowsIn(
    submissions.map((row) => row.assignment_id),
    (chunk) =>
      service
        .from("assignments")
        .select("id, feedback_policy, due_at")
        .eq("class_id", classId)
        .in("id", chunk),
    z.object({
      id: z.uuid(),
      feedback_policy: z.enum(FEEDBACK_POLICIES),
      due_at: timestamp.nullable(),
    }),
  );
  const ruleOf = new Map(rules.map((rule) => [rule.id, rule]));
  const visible = submissions
    .filter((row) => {
      const rule = ruleOf.get(row.assignment_id);
      return (
        rule !== undefined &&
        isFeedbackAvailable(
          { feedbackPolicy: rule.feedback_policy, dueAt: rule.due_at },
          row.submitted_at,
          now,
        )
      );
    })
    .slice(0, MAX_SUBMISSIONS);
  if (!visible.length) {
    return [];
  }
  const [answers, items] = await Promise.all([
    Promise.all(
      inBatches(visible.map((row) => row.id)).map((batch) =>
        selectEveryPage(
          (from, to) =>
            service
              .from("answers")
              .select("submission_id, question_id, is_correct")
              .in("submission_id", batch)
              .order("submission_id")
              .order("question_id")
              .range(from, to),
          z.object({ submission_id: z.uuid(), question_id: z.string(), is_correct: z.boolean() }),
        ),
      ),
    ),
    Promise.all(
      inBatches([...new Set(visible.map((row) => row.assignment_id))]).map((batch) =>
        selectEveryPage(
          (from, to) =>
            service
              .from("assignment_items")
              .select("assignment_id, question_id, tags:question_snapshot->tags")
              .in("assignment_id", batch)
              .order("assignment_id")
              .order("question_id")
              .range(from, to),
          z.object({
            assignment_id: z.uuid(),
            question_id: z.string(),
            tags: z.array(z.string()).nullable().catch(null),
          }),
        ),
      ),
    ),
  ]);
  const tagsOf = new Map(
    items
      .flat()
      .filter((item) => keep(item.tags ?? []))
      .map((item) => [`${item.assignment_id}:${item.question_id}`, item.tags ?? []]),
  );
  const submissionOf = new Map(visible.map((row) => [row.id, row]));
  return answers.flat().flatMap((answer) => {
    const submission = submissionOf.get(answer.submission_id);
    const tags = submission && tagsOf.get(`${submission.assignment_id}:${answer.question_id}`);
    return tags
      ? [{ tags, isCorrect: answer.is_correct, answeredAt: submission.submitted_at }]
      : [];
  });
}
