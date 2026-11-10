import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { format, resolveConfig } from "prettier";

import { JLPT_LEVELS } from "../lib/jlpt";
import {
  buildJlptDraftLesson,
  jlptDraftFileNames,
  jlptQuestionDraftSchema,
} from "../lib/jlpt-question-draft";

// Checks Reng's original JLPT question drafts and writes each one as lesson content to
// content/jlpt/generated/. It never publishes a lesson, creates an assignment or touches a
// database; a draft reaches learners only through a review bank a teacher publishes.
async function main() {
  for (const level of JLPT_LEVELS) {
    const files = jlptDraftFileNames(level);
    const draft = jlptQuestionDraftSchema.parse(
      JSON.parse(await readFile(resolve(files.source), "utf8")),
    );
    const outputPath = resolve(files.generated);
    // The repository formats JSON with Prettier, so the file is written the way it checks.
    const formatted = await format(JSON.stringify(buildJlptDraftLesson(draft), null, 2), {
      ...(await resolveConfig(outputPath)),
      filepath: outputPath,
    });
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, formatted);
    const review = draft.reviewedAt ? `reviewed ${draft.reviewedAt}` : "needs Japanese review";
    console.log(`${level}: ${draft.questions.length} questions (${review}) -> ${files.generated}`);
  }
  console.log("Nothing was published; add reviewed questions to a review bank to use them.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to build the JLPT drafts.");
  process.exitCode = 1;
});
