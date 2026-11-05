import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  buildFuriganaPatchSql,
  planFuriganaPatch,
  snapshotRowsSchema,
} from "../lib/furigana-patch";

// Writes one SQL transaction that adds furigana to questions already given, such as today's
// daily set. --before is the export of assignment_items (assignment_id, question_id, position,
// question_snapshot); --after is the same file with {漢字|かんじ} written into the text. Nothing is
// sent to a database here. Without --commit the file ends in ROLLBACK, so running it is a dry run.
async function readRows(path: string) {
  return snapshotRowsSchema.parse(JSON.parse(await readFile(resolve(path), "utf8")));
}

async function main() {
  const { values } = parseArgs({
    options: {
      before: { type: "string" },
      after: { type: "string" },
      out: { type: "string" },
      commit: { type: "boolean", default: false },
    },
  });
  if (!values.before || !values.after || !values.out) {
    throw new Error(
      "Provide --before <export.json> --after <with-furigana.json> --out <file.sql>.",
    );
  }
  const changes = planFuriganaPatch(await readRows(values.before), await readRows(values.after));
  if (!changes.length) {
    throw new Error("No question changed; write {漢字|かんじ} into the --after file first.");
  }
  await writeFile(resolve(values.out), buildFuriganaPatchSql(changes, values.commit));
  console.log(
    `Wrote ${values.out} (${values.commit ? "COMMIT" : "dry run, ends in ROLLBACK"}) for ${changes.length} question(s).`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
