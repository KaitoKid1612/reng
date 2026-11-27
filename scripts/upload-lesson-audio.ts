import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

import { LESSON_AUDIO_BUCKET } from "../lib/lesson-audio-url";
import { LISTENING_AUDIO_FOLDER } from "../lib/listening-set";

// Copies the lesson MP3s of public/audio/lessons to the public Supabase Storage bucket the web
// plays them from in production (NEXT_PUBLIC_LESSON_AUDIO_BASE_URL), so the files no longer ship
// in every Vercel deployment. Files are named by content hash and never overwritten: a file the
// bucket already holds is skipped, so the command is safe to run again after adding audio.
// Without --commit it only reports what it would do.
const PAGE = 1000;

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Set ${name} (the production project's URL and secret key).`);
  }
  return value;
}

async function main() {
  const { values } = parseArgs({ options: { commit: { type: "boolean", default: false } } });
  const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const folder = resolve(`public/${LISTENING_AUDIO_FOLDER}`);
  const local = (await readdir(folder)).filter((name) => /^[a-f0-9]{32}\.mp3$/.test(name)).sort();

  const { data: bucket } = await supabase.storage.getBucket(LESSON_AUDIO_BUCKET);
  if (!bucket) {
    console.log(
      `Bucket ${LESSON_AUDIO_BUCKET} does not exist${values.commit ? "; creating it" : ""}.`,
    );
    if (values.commit) {
      const { error } = await supabase.storage.createBucket(LESSON_AUDIO_BUCKET, {
        public: true,
        allowedMimeTypes: ["audio/mpeg"],
        fileSizeLimit: "5MB",
      });
      if (error) {
        throw new Error(`Could not create bucket ${LESSON_AUDIO_BUCKET}: ${error.message}`);
      }
    }
  } else if (!bucket.public) {
    throw new Error(
      `Bucket ${LESSON_AUDIO_BUCKET} exists but is not public; the web cannot play it.`,
    );
  }

  const stored = new Set<string>();
  for (let offset = 0; bucket; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(LESSON_AUDIO_BUCKET)
      .list("", { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) {
      throw new Error(`Could not list ${LESSON_AUDIO_BUCKET}: ${error.message}`);
    }
    data.forEach((item) => stored.add(item.name));
    if (data.length < PAGE) {
      break;
    }
  }
  const missing = local.filter((name) => !stored.has(name));
  console.log(
    `${local.length} local files, ${stored.size} in the bucket, ${missing.length} to upload.`,
  );
  if (!values.commit) {
    console.log("Dry run: add --commit to upload.");
    return;
  }
  let done = 0;
  for (const name of missing) {
    const { error } = await supabase.storage
      .from(LESSON_AUDIO_BUCKET)
      .upload(name, await readFile(resolve(folder, name)), {
        contentType: "audio/mpeg",
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) {
      throw new Error(`Upload of ${name} failed after ${done} files: ${error.message}`);
    }
    done += 1;
    if (done % 50 === 0) {
      console.log(`${done}/${missing.length}`);
    }
  }
  const { data: url } = supabase.storage.from(LESSON_AUDIO_BUCKET).getPublicUrl("");
  console.log(`Uploaded ${done} files. Base URL: ${url.publicUrl.replace(/\/$/, "")}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
