import { z } from "zod";

import { describeDisplayFixProblem, sameJson } from "@/lib/assignment-fix";
import { stripFuriganaMarks } from "@/lib/japanese-text";

// Bulk furigana for questions already given, such as today's daily set: the same display fix a
// teacher makes on /teach/assignments/[id], written as SQL for many questions at once. Unlike a
// fix by hand, a bulk change may only add or remove furigana, even in the prompt.

export const snapshotRowsSchema = z.array(
  z.object({
    assignment_id: z.uuid(),
    question_id: z.string().min(1),
    position: z.number().int().optional(),
    question_snapshot: z.record(z.string(), z.unknown()),
  }),
);

export type SnapshotRow = z.infer<typeof snapshotRowsSchema>[number];

export interface FuriganaChange {
  assignment_id: string;
  question_id: string;
  old: Record<string, unknown>;
  snapshot: Record<string, unknown>;
}

const TEXT_FIELDS = ["prompt", "passage", "explain", "transcript"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// The snapshot as learners would read it without furigana; every other field is kept as is.
function withoutFurigana(snapshot: Record<string, unknown>) {
  const copy: Record<string, unknown> = { ...snapshot };
  for (const key of TEXT_FIELDS) {
    const value = copy[key];
    if (typeof value === "string") {
      copy[key] = stripFuriganaMarks(value);
    }
  }
  if (Array.isArray(copy.options)) {
    copy.options = copy.options.map((option) =>
      typeof option === "string" ? stripFuriganaMarks(option) : option,
    );
  }
  if (Array.isArray(copy.tokens)) {
    copy.tokens = copy.tokens.map((token) =>
      isRecord(token) && typeof token.text === "string"
        ? { ...token, text: stripFuriganaMarks(token.text) }
        : token,
    );
  }
  return copy;
}

const rowKey = (row: SnapshotRow) => `${row.assignment_id}:${row.question_id}`;

/**
 * Compares an exported set of snapshots with the same set after furigana was written in, and
 * returns the snapshots that changed. Throws when anything other than furigana differs, when a
 * snapshot would no longer load, or when furigana would break or give away an answer.
 */
export function planFuriganaPatch(before: SnapshotRow[], after: SnapshotRow[]): FuriganaChange[] {
  const exported = new Map(before.map((row) => [rowKey(row), row]));
  if (
    after.length !== before.length ||
    new Set(after.map(rowKey)).size !== after.length ||
    after.some((row) => !exported.has(rowKey(row)))
  ) {
    throw new Error("The annotated file must list exactly the questions of the export.");
  }
  const changes: FuriganaChange[] = [];
  for (const row of after) {
    const old = exported.get(rowKey(row));
    if (
      !old ||
      !sameJson(withoutFurigana(row.question_snapshot), withoutFurigana(old.question_snapshot))
    ) {
      throw new Error(`${row.question_id}: only furigana may change; the text or answer differs.`);
    }
    if (sameJson(row.question_snapshot, old.question_snapshot)) {
      continue;
    }
    const problem = describeDisplayFixProblem(old.question_snapshot, row.question_snapshot);
    if (problem) {
      throw new Error(`${row.question_id}: ${problem}`);
    }
    changes.push({
      assignment_id: row.assignment_id,
      question_id: row.question_id,
      old: old.question_snapshot,
      snapshot: row.question_snapshot,
    });
  }
  return changes;
}

const DOLLAR_TAG = "$reng_furigana$";

/**
 * One transaction that applies every change through fix_assignment_question, so each one is
 * checked by the database, kept in the edit history and refused if the question changed since
 * the export. A single refusal leaves everything unchanged.
 */
export function buildFuriganaPatchSql(changes: FuriganaChange[], commit: boolean) {
  const payload = JSON.stringify(changes);
  if (payload.includes(DOLLAR_TAG)) {
    throw new Error("The questions contain the SQL quoting tag; choose another tag.");
  }
  return `-- Adds furigana to ${changes.length} question(s) of assignments already given, through
-- fix_assignment_question (migration 20261105044634), recorded as the class teacher's edit.
begin;
do $patch$
declare
  item record;
  v_teacher uuid;
  v_status text;
  v_fixed integer := 0;
begin
  for item in
    select * from jsonb_to_recordset(${DOLLAR_TAG}${payload}${DOLLAR_TAG}::jsonb)
      as f(assignment_id uuid, question_id text, old jsonb, snapshot jsonb)
  loop
    select c.teacher_id into v_teacher
      from public.assignments a join public.classes c on c.id = a.class_id
      where a.id = item.assignment_id;
    v_status := public.fix_assignment_question(v_teacher, item.assignment_id, item.question_id,
      item.old, item.snapshot);
    if v_status <> 'fixed' then
      raise exception 'Furigana refused for %: %', item.question_id, v_status;
    end if;
    v_fixed := v_fixed + 1;
  end loop;
  raise notice 'Furigana added to % question(s).', v_fixed;
end
$patch$;
${commit ? "commit;" : "rollback;"}
`;
}
