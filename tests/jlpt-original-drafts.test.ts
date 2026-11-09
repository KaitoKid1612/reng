import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { lessonContentSchema } from "../lib/lesson-schema";
import { parseAssignableQuestion } from "../lib/assignment";

for (const level of ["n5", "n4"] as const) {
  test(`JLPT ${level.toUpperCase()} original draft matches Reng lesson schema`, () => {
    const source = JSON.parse(
      readFileSync(
        join(process.cwd(), "content", "jlpt", `${level}-original-question-draft.json`),
        "utf8",
      ),
    ) as {
      origin: string;
      status: string;
      questions: { id: string }[];
    };
    assert.equal(source.origin, "original");
    assert.equal(source.status, "draft");
    assert.ok(source.questions.length > 0);

    const generated = JSON.parse(
      readFileSync(
        join(process.cwd(), "content", "jlpt", "generated", `${level}-lesson-content-draft.json`),
        "utf8",
      ),
    );
    const parsed = lessonContentSchema.parse(generated);
    assert.equal(parsed.questions.length, source.questions.length);
    assert.deepEqual(
      parsed.questions.map((question) => question.id),
      source.questions.map((question) => question.id),
    );

    const ids = new Set<string>();
    for (const question of parsed.questions) {
      assert.ok(!ids.has(question.id), `Duplicate ID: ${question.id}`);
      ids.add(question.id);
      const assignable = parseAssignableQuestion(question);
      assert.equal(assignable.type, "choice");
      if (assignable.type === "choice") {
        assert.equal(assignable.answer.length, 1);
        assert.equal(assignable.multiple, false);
      }
    }
  });
}
