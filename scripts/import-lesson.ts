import { readFile, open, rename, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

import { publishLocalLesson } from "../lib/lesson-catalog";
import { lessonCatalogSchema, lessonDraftSchema } from "../lib/lesson-schema";

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      publish: { type: "string" },
      revision: { type: "string" },
      owner: { type: "string" },
    },
  });
  if (!values.file) {
    throw new Error("Provide --file path/to/lesson.json. Default behavior is validation only.");
  }
  const draft = lessonDraftSchema.parse(JSON.parse(await readFile(resolve(values.file), "utf8")));
  if (!values.publish) {
    console.log(
      `Validated ${draft.id}: ${draft.content.slides.length} slides. Dry-run; no files or services changed.`,
    );
    return;
  }
  const revision = Number(values.revision);
  if (values.revision === undefined || !Number.isSafeInteger(revision) || revision < 0) {
    throw new Error("Publishing requires --revision with the current nonnegative revision.");
  }
  if (values.publish === "local") {
    const path = resolve("content/lesson-catalog.json");
    const lockPath = `${path}.lock`;
    const lock = await open(lockPath, "wx");
    try {
      const catalog = lessonCatalogSchema.parse(JSON.parse(await readFile(path, "utf8")));
      const next = publishLocalLesson(catalog, draft, revision);
      await writeFile(`${path}.tmp`, JSON.stringify(next, null, 2) + "\n");
      await rename(`${path}.tmp`, path);
      console.log(
        `Published local ${draft.id}, version ${revision + 1}. Previous versions are preserved.`,
      );
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
    return;
  }
  if (values.publish !== "supabase") {
    throw new Error("Publish target must be local or supabase.");
  }
  if (draft.isSample) {
    throw new Error("Review this sample and set isSample=false before publishing to Supabase.");
  }
  if (
    draft.content.vocab.some((item) => !item.audio) ||
    draft.content.grammar.some((item) => item.examples.some((example) => !example.audio))
  ) {
    throw new Error("Generate and review lesson audio before publishing to Supabase.");
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || !values.owner) {
    throw new Error("Supabase URL, secret key and --owner are required for cloud publishing.");
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const hashes = [
    ...new Set(
      [
        ...draft.content.vocab.map((item) => item.audio),
        ...draft.content.grammar.flatMap((grammar) =>
          grammar.examples.map((example) => example.audio),
        ),
      ].filter((hash): hash is string => Boolean(hash)),
    ),
  ];
  if (hashes.length) {
    const { data: assets, error: assetError } = await client
      .from("audio_assets")
      .select("hash")
      .in("hash", hashes);
    if (assetError || assets?.length !== hashes.length) {
      throw new Error(
        "Some lesson audio assets are not registered in Supabase. Sync audio metadata before publishing.",
      );
    }
  }
  const { data, error } = await client.rpc("publish_lesson", {
    p_lesson_id: draft.id,
    p_owner_id: values.owner,
    p_expected_revision: revision,
    p_title: draft.title,
    p_title_ja: draft.titleJa,
    p_summary: draft.summary,
    p_order_no: draft.order,
    p_course_id: draft.courseId,
    p_content: draft.content,
  });
  if (error) {
    throw new Error(
      "Cloud publish failed. Check the project, migration, owner and revision; no partial publication is expected.",
    );
  }
  console.log(`Published ${draft.id}, version ${String(data)}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Lesson import failed.");
  process.exitCode = 1;
});
