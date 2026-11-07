import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { parseAssignableQuestion } from "../lib/assignment";
import { lessonDraftSchema } from "../lib/lesson-schema";
import {
  findListeningAudio,
  LISTENING_AUDIO_FOLDER,
  parseListeningSet,
} from "../lib/listening-set";

// Builds a NEW bank file. It never publishes, updates a database, or modifies the source.
// Example:
// node --import tsx scripts/merge-daily-listening.ts --bank bank.json
//   --listening content/listening/n5-daily-1-13.json --out bank-with-audio.json
async function main() {
  const { values } = parseArgs({
    options: {
      bank: { type: "string" },
      listening: { type: "string" },
      out: { type: "string" },
    },
  });
  if (!values.bank || !values.listening || !values.out) {
    throw new Error("Provide --bank <existing-bank.json> --listening <audio-set.json> --out <new-bank.json>.");
  }
  const bank = lessonDraftSchema.parse(JSON.parse(await readFile(resolve(values.bank), "utf8")));
  const set = parseListeningSet(JSON.parse(await readFile(resolve(values.listening), "utf8")));
  const audit = findListeningAudio(set);
  if (audit.missing.length || audit.stale.length) {
    throw new Error(`Listening audio missing: ${audit.missing.length}; stale: ${audit.stale.length}`);
  }
  for (const asset of audit.assets) {
    const file = resolve(`public/${LISTENING_AUDIO_FOLDER}/${asset.hash}.mp3`);
    const fileStat = await stat(file).catch(() => null);
    if (!fileStat || fileStat.size <= 100) {
      throw new Error(`Missing or empty MP3: ${file}`);
    }
  }
  const original = bank.content.questions;
  const ids = new Set(original.map((question) => question.id));
  const additions = set.content.questions.filter((question) => !ids.has(question.id));
  for (const question of additions) {
    parseAssignableQuestion(question);
  }
  const merged = {
    ...bank,
    summary: `${bank.summary} Có thêm ${additions.length} câu nghe từ ${set.title}.`,
    content: { ...bank.content, questions: [...original, ...additions] },
  };
  if (merged.content.questions.length > 1000) {
    throw new Error("Merged bank exceeds the supported question limit; split the bank.");
  }
  await writeFile(resolve(values.out), JSON.stringify(merged, null, 2) + "\n");
  console.log(`Prepared ${merged.content.questions.length} questions (${additions.length} new listening); source bank untouched.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Cannot merge listening bank.");
  process.exitCode = 1;
});
