import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const MIGRATION = "20261125_spread_n5_bank_answer_positions";
const TEACHER = "00000000-0000-4000-8000-0000000000e1";
const LEARNER = "00000000-0000-4000-8000-0000000000e2";

type Question = {
  id: string;
  type: string;
  options?: string[];
  answer: (number | string)[];
  [key: string]: unknown;
};

// The place the migration gives a question's right option.
function spreadPosition(id: string, optionCount: number) {
  return parseInt(createHash("md5").update(id).digest("hex").slice(0, 7), 16) % optionCount;
}

function isMovable(question: Question) {
  const isSingleChoice =
    (question.type === "choice" && question.multiple !== true) ||
    (question.type === "listen" && question.responseType === "choice");
  const options = question.options ?? [];
  return (
    isSingleChoice &&
    options.length >= 2 &&
    question.answer.length === 1 &&
    typeof question.answer[0] === "number" &&
    !("image" in question) &&
    options.some((option) => !/^\s*[0-9０-９]/.test(option))
  );
}

const choice = (id: string, options: string[], extra: Partial<Question> = {}): Question => ({
  id,
  type: "choice",
  prompt: `Câu ${id}.`,
  options,
  answer: [0],
  multiple: false,
  points: 1,
  tags: ["n5"],
  ...extra,
});

const questions: Question[] = [
  ...["a", "b", "c", "d", "e", "f", "g", "h"].map((suffix) =>
    choice(`nguyen-n5-${suffix}`, ["đúng", "sai 1", "sai 2", "sai 3"]),
  ),
  choice("numbers", ["5 phút", "10 phút", "30 phút"]),
  choice("picture", ["ア", "イ", "ウ", "エ"], { image: { src: "panel.png", alt: "Bảng" } }),
  choice("several", ["đúng", "cũng đúng", "sai"], { multiple: true, answer: [0, 1] }),
  {
    id: "listen-choice",
    type: "listen",
    responseType: "choice",
    prompt: "Nghe.",
    audio: "clip",
    transcript: "ちゅうごくから きました。",
    options: ["Trung Quốc", "Hàn Quốc", "Thái Lan"],
    answer: [0],
    points: 1,
    tags: ["n5"],
  },
  { id: "fill", type: "fill", prompt: "Điền.", answer: ["あ"], points: 1, tags: ["n5"] },
];

const content = {
  schemaVersion: 1,
  vocab: [],
  grammar: [],
  slides: [{ id: "s1", type: "title", jp: "N5", vi: "N5" }],
  questions,
};

async function setUp() {
  const db = new PGlite();
  const files = (await readdir("supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const index = files.findIndex((file) => file.includes("spread_n5_bank_answer_positions"));
  assert.ok(index > 0, MIGRATION);
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
  `);
  for (const file of files.slice(0, index)) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }
  const migration = await readFile(`supabase/migrations/${files[index]}`, "utf8");
  return { db, runMigration: () => db.exec(migration) };
}

async function one<Row>(db: PGlite, sql: string, params: unknown[] = []) {
  const result = await db.query<Row>(sql, params);
  assert.equal(result.rows.length, 1, sql);
  return result.rows[0];
}

async function publishBank(db: PGlite) {
  for (const [id, name] of [
    [TEACHER, "Cô Lan"],
    [LEARNER, "Nguyên"],
  ]) {
    await db.query(
      "insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data) values ($1, $2, now(), $3)",
      [id, `${id.slice(-2)}@example.test`, { full_name: name }],
    );
  }
  await db.query("update public.profiles set role = 'teacher' where id = $1", [TEACHER]);
  await db.exec("set role service_role");
  const version = await one<{ id: string }>(
    db,
    "select public.publish_lesson('n5-sheet-review-bank', $1, 0, 'Ngân hàng N5', '', '', 1, 'n5', $2) as id",
    [TEACHER, content],
  );
  const classRow = await one<{ id: string }>(
    db,
    "insert into public.classes(teacher_id, name, join_code) values ($1, 'Lớp 1', 'ABCDEFGH') returning id",
    [TEACHER],
  );
  await db.query("select * from public.join_class($1, 'ABCDEFGH')", [LEARNER]);
  await db.query(
    "select public.upsert_class_lesson($1, $2, 'n5-sheet-review-bank', $3, 1, now() - interval '1 day')",
    [TEACHER, classRow.id, version.id],
  );
  const assignment = await one<{ id: string }>(
    db,
    "select public.publish_assignment($1, $2, 'n5-sheet-review-bank', 'Luyện tập hằng ngày 25/11', 'practice', null, false, 70, 2, 'after_submit', $3, null) as id",
    [TEACHER, classRow.id, questions.map((question) => question.id)],
  );
  await db.exec("reset role");
  return { versionId: version.id, classId: classRow.id, assignmentId: assignment.id };
}

test("the N5 bank gets a version with spread answers, and the class moves to it", async () => {
  const { db, runMigration } = await setUp();
  try {
    const { versionId, classId, assignmentId } = await publishBank(db);
    const snapshotsBefore = await db.query(
      "select question_id, question_snapshot from public.assignment_items where assignment_id = $1 order by position",
      [assignmentId],
    );

    await runMigration();

    const bank = await one<{
      published_version_id: string;
      draft_content: { questions: Question[] };
    }>(
      db,
      "select published_version_id, draft_content from public.lessons where id = 'n5-sheet-review-bank'",
    );
    assert.notEqual(bank.published_version_id, versionId);
    const published = await one<{ version_no: number; content: { questions: Question[] } }>(
      db,
      "select version_no, content from public.lesson_versions where id = $1",
      [bank.published_version_id],
    );
    assert.equal(published.version_no, 2);
    assert.deepEqual(bank.draft_content, published.content);
    const pinned = await one<{ lesson_version_id: string }>(
      db,
      "select lesson_version_id from public.class_lessons where class_id = $1 and lesson_id = 'n5-sheet-review-bank'",
      [classId],
    );
    assert.equal(pinned.lesson_version_id, bank.published_version_id);

    const after = new Map(published.content.questions.map((question) => [question.id, question]));
    for (const before of questions) {
      const moved = after.get(before.id);
      assert.ok(moved, before.id);
      if (!isMovable(before)) {
        assert.deepEqual(moved, before, `${before.id} stays as it was`);
        continue;
      }
      const options = before.options ?? [];
      const movedOptions = moved.options ?? [];
      const right = options[before.answer[0] as number];
      const target = spreadPosition(before.id, options.length);
      assert.deepEqual(moved.answer, [target], before.id);
      assert.equal(movedOptions[target], right, `${before.id} keeps its right answer`);
      assert.deepEqual([...movedOptions].sort(), [...options].sort(), before.id);
      assert.deepEqual(
        { ...moved, options: undefined, answer: undefined },
        { ...before, options: undefined, answer: undefined },
        `${before.id} changes nothing else`,
      );
    }
    const firsts = published.content.questions.filter(
      (question) => isMovable(question) && question.answer[0] === 0,
    ).length;
    assert.ok(firsts < questions.filter(isMovable).length, "not every right answer is first");

    // Assignments already made keep their snapshots.
    const snapshotsAfter = await db.query(
      "select question_id, question_snapshot from public.assignment_items where assignment_id = $1 order by position",
      [assignmentId],
    );
    assert.deepEqual(snapshotsAfter.rows, snapshotsBefore.rows);
    const audit = await one<{ count: number }>(
      db,
      "select count(*)::int as count from public.audit_events where action = 'lesson.answer_positions_spread' and resource_id = $1",
      [bank.published_version_id],
    );
    assert.equal(audit.count, 1);

    // Running it again publishes nothing new.
    await runMigration();
    const versions = await one<{ count: number }>(
      db,
      "select count(*)::int as count from public.lesson_versions where lesson_id = 'n5-sheet-review-bank'",
    );
    assert.equal(versions.count, 2);
  } finally {
    await db.close();
  }
});

test("the spread is refused while the bank has unpublished edits, and skipped without the bank", async () => {
  const empty = await setUp();
  try {
    await empty.runMigration();
  } finally {
    await empty.db.close();
  }
  const { db, runMigration } = await setUp();
  try {
    await publishBank(db);
    await db.query(
      "update public.lessons set draft_content = jsonb_set(draft_content, '{slides,0,vi}', '\"Bản nháp\"') where id = 'n5-sheet-review-bank'",
    );
    await assert.rejects(runMigration(), /unpublished edits/);
  } finally {
    await db.close();
  }
});

test("the repository copy of the N5 bank uses the same answer positions as the migration", async () => {
  const bank = JSON.parse(
    await readFile("content/review-banks/n5-daily-with-listening.json", "utf8"),
  ) as { id: string; content: { questions: Question[] } };
  assert.equal(bank.id, "n5-sheet-review-bank");
  const movable = bank.content.questions.filter(isMovable);
  const counts = new Map<number, number>();
  for (const question of movable) {
    assert.equal(
      question.answer[0],
      spreadPosition(question.id, question.options?.length ?? 0),
      question.id,
    );
    counts.set(question.answer[0] as number, (counts.get(question.answer[0] as number) ?? 0) + 1);
  }
  const busiest = Math.max(...counts.values());
  assert.ok(busiest / movable.length < 0.4, `one position holds ${busiest} of ${movable.length}`);
});
