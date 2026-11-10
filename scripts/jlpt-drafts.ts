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
// content/jlpt/generated/ for review. It never publishes a lesson, creates an assignment or
// touches a database; the Japanese still needs a reviewer before a teacher publishes it.
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
    console.log(`${level}: ${draft.questions.length} questions -> ${files.generated}`);
  }
  console.log("Generated drafts only. Review the Japanese before publishing.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to build the JLPT drafts.");
  process.exitCode = 1;
});
