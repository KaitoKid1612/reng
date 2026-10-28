import { readFile, readdir, mkdir, open, rename, stat, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";

import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

import { kanaItems } from "../lib/data";
import { manifestSchema } from "../lib/kana";
import { audioHash, canonicalAudio } from "../lib/audio-config";
import { generateAudioAssets } from "../lib/audio-generation";
import { synthesizeSpeech } from "../lib/azure-speech";
import {
  applyContentAudio,
  applyLessonAudio,
  planContentAudio,
  planLessonAudio,
} from "../lib/lesson-audio";
import { draftContentSchema } from "../lib/lesson-draft";
import { lessonDraftSchema } from "../lib/lesson-schema";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DraftContent } from "../lib/lesson-draft";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}; check .env.local. No cloud changes have been made.`);
  }
  return value;
}
function isNotFound(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    (("code" in error && error.code === "ENOENT") ||
      ("name" in error && error.name === "NotFound") ||
      ("$metadata" in error &&
        (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 404))
  );
}

function isLocalSupabase(url: string) {
  return ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
}

interface DatabaseDraft {
  id: string;
  revision: number;
  content: DraftContent;
}

// Drafts edited on the web live in Supabase; the revision guards against concurrent edits.
async function loadDatabaseDrafts(client: SupabaseClient, lessonId: string | undefined) {
  let query = client
    .from("lessons")
    .select("id, draft_content, draft_revision")
    .is("archived_at", null);
  if (lessonId) {
    query = query.eq("id", lessonId);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(
      "Unable to read lesson drafts from Supabase. Check the URL, key and migrations.",
    );
  }
  return (data ?? []).flatMap((row): DatabaseDraft[] => {
    const parsed = draftContentSchema.safeParse(row.draft_content);
    if (!parsed.success) {
      console.warn(`Skipped ${String(row.id)}: draft content does not match the draft contract.`);
      return [];
    }
    return [{ id: String(row.id), revision: Number(row.draft_revision), content: parsed.data }];
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      generate: { type: "boolean", default: false },
      local: { type: "boolean", default: false },
      r2: { type: "boolean", default: false },
      "sync-db": { type: "boolean", default: false },
      lessons: { type: "boolean", default: false },
      db: { type: "boolean", default: false },
      lesson: { type: "string" },
    },
  });
  const isLessonAudio = values.lessons;
  const isDatabaseSource = values.db;
  if ((isDatabaseSource || values.lesson) && !isLessonAudio) {
    throw new Error("--db and --lesson only apply to lesson audio (--lessons).");
  }
  const audioFolder = isLessonAudio ? "audio/lessons" : "audio/kana";
  const generate = values.generate;
  const cloud = values.r2;
  const sync = values["sync-db"];
  const voice = process.env.AZURE_SPEECH_VOICE || "ja-JP-NanamiNeural";
  const sourceClient = isDatabaseSource
    ? createClient(required("SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
  const databaseDrafts = sourceClient ? await loadDatabaseDrafts(sourceClient, values.lesson) : [];
  const draftFiles =
    isLessonAudio && !isDatabaseSource
      ? await Promise.all(
          (await readdir("content/lessons"))
            .filter((file) => file.endsWith(".json"))
            .map(async (file) => {
              const path = resolve("content/lessons", file);
              const original = await readFile(path, "utf8");
              return { path, original, draft: lessonDraftSchema.parse(JSON.parse(original)) };
            }),
        )
      : [];
  let plan = kanaItems.map((item) => {
    const config = canonicalAudio(item.kana, voice);
    return { itemId: item.id, config, hash: audioHash(config) };
  });
  if (isDatabaseSource) {
    plan = databaseDrafts.flatMap((draft) => planContentAudio(draft.id, draft.content, voice));
  } else if (isLessonAudio) {
    plan = planLessonAudio(
      draftFiles
        .filter((file) => !values.lesson || file.draft.id === values.lesson)
        .map((file) => file.draft),
      voice,
    );
  }
  if (!generate) {
    if (values.local || cloud || sync) {
      throw new Error("Use --local, --r2 and --sync-db only with --generate.");
    }
    console.log(
      `Dry-run: ${plan.length} ${isLessonAudio ? "lesson audio entries" : "kana items"}, voice ${voice}, ${new Set(plan.map((asset) => asset.hash)).size} hashes. No network calls or file writes.`,
    );
    const lessonFlags = `${isLessonAudio ? " --lessons" : ""}${isDatabaseSource ? " --db --sync-db" : ""}`;
    console.log(
      `Generate locally: npm run audio:generate -- --local${lessonFlags}; upload: npm run audio:generate -- --r2${lessonFlags}`,
    );
    return;
  }
  if (cloud === values.local) {
    throw new Error("Choose exactly one destination: --local or --r2.");
  }
  // Local paths are only meaningful for a Supabase stack on this machine.
  if (sync && !cloud && !isLocalSupabase(required("SUPABASE_URL"))) {
    throw new Error("--sync-db requires --r2 so metadata contains a public URL.");
  }
  if (isDatabaseSource && !sync) {
    console.warn(
      "Without --sync-db the new hashes are not registered and publishing will reject them.",
    );
  }
  const key = required("AZURE_SPEECH_KEY");
  const region = required("AZURE_SPEECH_REGION");
  if (!/^[a-z0-9-]+$/.test(region)) {
    throw new Error("Azure region must be a region code, not a URL.");
  }
  const bucket = cloud ? required("R2_BUCKET") : "";
  const account = cloud ? required("R2_ACCOUNT_ID") : "";
  if (cloud && !/^[a-f0-9]{32}$/.test(account)) {
    throw new Error("R2_ACCOUNT_ID must be a valid account ID.");
  }
  const base = cloud
    ? required(isLessonAudio ? "R2_LESSON_PUBLIC_BASE_URL" : "R2_PUBLIC_BASE_URL").replace(
        /\/$/,
        "",
      )
    : `/${audioFolder}`;
  if (cloud && !base.startsWith("https://")) {
    throw new Error(
      "R2_PUBLIC_BASE_URL must be an HTTPS public base, such as https://audio.example.com/audio/kana.",
    );
  }
  const s3 = cloud
    ? new S3Client({
        region: "auto",
        endpoint: `https://${account}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: required("R2_ACCESS_KEY_ID"),
          secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
        },
        maxAttempts: 3,
      })
    : null;
  const db = sync
    ? createClient(required("SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
  const manifestPath = resolve(
    isLessonAudio ? "content/lesson-audio-manifest.json" : "content/audio-manifest.json",
  );
  const startManifest = isDatabaseSource
    ? { schemaVersion: 1 as const, assets: {} }
    : manifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
  const lockPath = resolve(".audio-generation.lock");
  const lock = await open(lockPath, "wx").catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(
        "Audio generation is already running or a stale lock exists. Check the process before removing the lock.",
      );
    }
    throw error;
  });
  try {
    const manifest = startManifest;
    await mkdir(resolve(`public/${audioFolder}`), { recursive: true });
    const result = await generateAudioAssets({
      plan,
      manifest,
      store: {
        async exists(hash) {
          try {
            const size = s3
              ? (
                  await s3.send(
                    new HeadObjectCommand({ Bucket: bucket, Key: `${audioFolder}/${hash}.mp3` }),
                  )
                ).ContentLength
              : (await stat(resolve(`public/${audioFolder}/${hash}.mp3`))).size;

            if (!size || size < 100) {
              throw new Error(
                `Existing audio asset ${hash} is incomplete; review it before retrying.`,
              );
            }

            return true;
          } catch (error) {
            if (isNotFound(error)) {
              return false;
            }

            throw new Error(`Unable to inspect asset ${hash}; stopped before generating audio.`, {
              cause: error,
            });
          }
        },
        async write(hash, bytes) {
          if (s3) {
            await s3.send(
              new PutObjectCommand({
                Bucket: bucket,
                Key: `${audioFolder}/${hash}.mp3`,
                Body: bytes,
                ContentType: "audio/mpeg",
                CacheControl: "public, max-age=31536000, immutable",
                IfNoneMatch: "*",
              }),
            );
          } else {
            const localPath = resolve(`public/${audioFolder}/${hash}.mp3`);
            await writeFile(`${localPath}.tmp`, bytes);
            await rename(`${localPath}.tmp`, localPath);
          }

          await delay(150);
        },
      },
      synthesize: (config) => synthesizeSpeech(config, { region, key }),
      async syncMetadata(asset) {
        if (!db) {
          return;
        }

        const { error } = await db.from("audio_assets").upsert(
          {
            hash: asset.hash,
            text: asset.config.text,
            voice,
            url: `${base}/${asset.hash}.mp3`,
            config: asset.config,
          },
          { onConflict: "hash" },
        );

        if (error) {
          throw new Error(
            `Unable to sync metadata for ${asset.itemId}; the asset is retained for retry.`,
          );
        }
      },
      async saveManifest(nextManifest) {
        // Database drafts carry their own hashes; the file manifest belongs to repository drafts.
        if (isDatabaseSource) {
          return;
        }
        await writeFile(`${manifestPath}.tmp`, JSON.stringify(nextManifest, null, 2) + "\n");
        await rename(`${manifestPath}.tmp`, manifestPath);
      },
      onAsset: (asset, existed) =>
        console.log(`${asset.itemId}: ${existed ? "exists" : "generated"} ${asset.hash}`),
    });
    if (sourceClient) {
      for (const draft of databaseDrafts) {
        const content = applyContentAudio(draft.id, draft.content, result.manifest.assets);
        if (JSON.stringify(content) === JSON.stringify(draft.content)) {
          continue;
        }
        const { data, error } = await sourceClient
          .from("lessons")
          .update({
            draft_content: content,
            draft_revision: draft.revision + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", draft.id)
          .eq("draft_revision", draft.revision)
          .select("id");
        if (error || !data?.length) {
          console.warn(
            `${draft.id}: draft changed during generation; run again before publishing.`,
          );
          continue;
        }
        console.log(
          `${draft.id}: audio hashes written to the draft (revision ${draft.revision + 1}).`,
        );
      }
      console.log("Publish from the lesson editor after reviewing the audio.");
    } else if (isLessonAudio) {
      for (const file of draftFiles) {
        if ((await readFile(file.path, "utf8")) !== file.original) {
          throw new Error(
            `Draft changed during audio generation: ${file.path}. Re-run before publishing.`,
          );
        }
        const next = applyLessonAudio(file.draft, result.manifest.assets);
        await writeFile(`${file.path}.tmp`, JSON.stringify(next, null, 2) + "\n");
        await rename(`${file.path}.tmp`, file.path);
      }
      console.log(
        "Updated lesson drafts only. Publish a new version to make the new audio visible.",
      );
    }
    console.log(
      `Completed ${plan.length} items; generated ${result.createdCount}. Review pronunciation before production use.`,
    );
  } finally {
    s3?.destroy();
    await lock.close();
    await unlink(lockPath);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Audio generation failed.");
  process.exitCode = 1;
});
