import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { parseAssignableQuestion } from "../lib/assignment";
import { BUNDLED_LISTENING_AUDIO } from "../lib/bundled-listening";
import { findFuriganaProblems } from "../lib/lesson-draft";
import { lessonDraftSchema } from "../lib/lesson-schema";
import { buildBankPublishSql } from "../lib/review-bank-sql";
import { BANK_LANGUAGES, findBankLanguageProblems } from "../lib/review-bank";

// Writes one SQL transaction (lib/review-bank-sql.ts) that publishes a review bank as the next
// version of its lesson and moves the owner's classes that use the bank to that version. Audio of
// questions taken from a bundled listening set is registered in the same transaction. With
// --class, a bank not yet on the server is created for that class's teacher and added to the
// class; --daily-source also makes it the class's daily source. Nothing is sent to a database
// here. Without --commit the file ends in ROLLBACK, so running it is a dry run. Rerunning after a
// commit publishes nothing new: the newest version already has the content.
async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      out: { type: "string" },
      commit: { type: "boolean", default: false },
      language: { type: "string", default: "ja-JP" },
      // The lesson on the server may have another ID than the bank file, such as one created
      // by hand before the file existed.
      lesson: { type: "string" },
      class: { type: "string" },
      "daily-source": { type: "boolean", default: false },
    },
  });
  if (!values.file || !values.out) {
    throw new Error("Provide --file path/to/bank.json and --out path/to/file.sql.");
  }
  const language = BANK_LANGUAGES.find((item) => item === values.language);
  if (!language) {
    throw new Error(`--language must be one of ${BANK_LANGUAGES.join(", ")}.`);
  }
  const bank = lessonDraftSchema.parse(JSON.parse(await readFile(resolve(values.file), "utf8")));
  // Learners see furigana as written, so a broken mark or one that shows the answer stops here.
  const furiganaProblems = findFuriganaProblems(bank.content.questions);
  if (furiganaProblems.length) {
    throw new Error(
      `Furigana needs fixing:\n${furiganaProblems
        .slice(0, 10)
        .map((problem) => problem.message)
        .join("\n")}`,
    );
  }
  const problems = findBankLanguageProblems(bank.content, language);
  if (problems.length) {
    throw new Error(`The bank does not fit ${language}:\n${problems.slice(0, 10).join("\n")}`);
  }
  // A question the classroom cannot assign would stay out of every daily set.
  bank.content.questions.forEach((question) => parseAssignableQuestion(question));
  const lessonId = values.lesson ?? bank.id;
  // The editor refuses to publish a later version while any audio hash is unregistered.
  const audioHashes = [
    ...new Set(
      bank.content.questions.flatMap((question) =>
        (question.type === "listen" || question.type === "dictation") && question.audio
          ? [question.audio]
          : [],
      ),
    ),
  ];
  const bundledAudio = audioHashes.flatMap((hash) => BUNDLED_LISTENING_AUDIO.get(hash) ?? []);
  const otherAudio = audioHashes.length - bundledAudio.length;
  const sql = buildBankPublishSql({
    lessonId,
    bank,
    audio: bundledAudio,
    commit: values.commit,
    classId: values.class,
    dailySource: values["daily-source"],
  });
  await writeFile(resolve(values.out), sql);
  console.log(
    `Wrote ${values.out} (${values.commit ? "COMMIT" : "dry run, ends in ROLLBACK"}) for ${lessonId}: ${bank.content.questions.length} questions, ${bundledAudio.length} bundled audio registered.`,
  );
  if (otherAudio) {
    console.warn(
      `${otherAudio} audio hash(es) are not from a bundled listening set; register them with npm run audio:generate first.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Could not write the bank SQL.");
  process.exitCode = 1;
});
