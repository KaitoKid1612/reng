import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  DEFAULT_LISTENING_VOICE,
  findListeningAudio,
  LISTENING_AUDIO_FOLDER,
  parseListeningSet,
} from "../lib/listening-set";

// Writes one SQL transaction that gives a teacher a draft lesson made from a listening set such
// as content/listening/minna-1-15.json. Nothing is sent to a database here. Without --commit the
// file ends in ROLLBACK, so running it is a dry run. Audio made with
// `npm run audio:generate -- --local --listening <file>` is served with the web from
// public/audio/lessons; this file registers it so the teacher can publish after listening.
// Rerunning returns the same draft instead of making another one.

const DOLLAR_TAG = "$reng_listening$";

function quote(value: string) {
  if (value.includes(DOLLAR_TAG)) {
    throw new Error("The listening text contains the SQL quoting tag; choose another tag.");
  }
  return `${DOLLAR_TAG}${value}${DOLLAR_TAG}`;
}

async function hasAudioFile(hash: string) {
  try {
    return (await stat(resolve(`public/${LISTENING_AUDIO_FOLDER}/${hash}.mp3`))).size > 100;
  } catch {
    return false;
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      owner: { type: "string" },
      out: { type: "string" },
      commit: { type: "boolean", default: false },
    },
  });
  if (!values.file || !values.owner || !values.out) {
    throw new Error(
      "Provide --file content/listening/<set>.json --owner <teacher email> --out <file.sql>.",
    );
  }
  const set = parseListeningSet(JSON.parse(await readFile(resolve(values.file), "utf8")));
  const owner = values.owner.trim();
  if (!/^[^\s@]+@[^\s@]+$/.test(owner)) {
    throw new Error("--owner must be the teacher's email address.");
  }
  const voice = process.env.AZURE_SPEECH_VOICE || DEFAULT_LISTENING_VOICE;
  const audio = findListeningAudio(set, voice);
  if (audio.stale.length) {
    throw new Error(
      `Audio no longer matches the transcript or voice of ${audio.stale.join(", ")}; run npm run audio:generate -- --local --listening ${values.file} again.`,
    );
  }
  const withoutFiles = [];
  for (const asset of audio.assets) {
    if (!(await hasAudioFile(asset.hash))) {
      withoutFiles.push(asset.itemId);
    }
  }
  if (withoutFiles.length) {
    throw new Error(
      `public/${LISTENING_AUDIO_FOLDER} has no file for ${withoutFiles.slice(0, 5).join(", ")}; generate the audio first.`,
    );
  }
  // Publishing checks that every hash in the draft is registered; the files ship with the web.
  const assetRows = audio.assets
    .map(
      (asset) =>
        `  (${quote(asset.hash)}, ${quote(asset.config.text)}, ${quote(asset.config.voice)}, ${quote(`/${LISTENING_AUDIO_FOLDER}/${asset.hash}.mp3`)}, ${quote(JSON.stringify(asset.config))}::jsonb)`,
    )
    .join(",\n");
  const registerAudio = assetRows
    ? `insert into public.audio_assets(hash, text, voice, url, config) values
${assetRows}
on conflict (hash) do nothing;
`
    : "";
  const fingerprint = `listening:${set.id}`;
  const questionCount = set.content.questions.length;
  const sql = `-- ${set.id}: a draft with ${questionCount} listening questions for ${owner}; ${audio.assets.length} have audio.
begin;
${registerAudio}do $import$
declare
  teacher uuid;
  draft_id text;
begin
  select u.id into teacher
    from auth.users u
    join public.profiles p on p.id = u.id and p.role = 'teacher'
    join public.teacher_accounts t on t.user_id = u.id and t.status = 'active'
    where lower(u.email) = lower(${quote(owner)});
  if teacher is null then
    raise exception 'No active teacher has the email %', ${quote(owner)};
  end if;
  draft_id := public.insert_lesson_copy(
    teacher,
    md5(${quote(fingerprint)} || ':' || teacher::text)::uuid,
    ${quote(fingerprint)},
    ${quote(set.title)},
    ${quote(set.titleJa)},
    ${quote(set.summary)},
    ${set.order},
    ${quote(set.courseId)},
    ${quote(JSON.stringify(set.content))}::jsonb,
    '{}'::jsonb,
    null,
    null
  );
  -- A draft made before its audio existed takes the new content, unless the teacher saved it since.
  update public.lessons
    set draft_content = ${quote(JSON.stringify(set.content))}::jsonb,
      draft_revision = draft_revision + 1,
      updated_at = now()
    where id = draft_id and draft_revision = 0 and published_version_id is null
      and draft_content is distinct from ${quote(JSON.stringify(set.content))}::jsonb;
  raise notice 'Listening draft: %', draft_id;
end
$import$;
select l.id, l.title, jsonb_array_length(l.draft_content -> 'questions') as questions
  from public.lessons l
  join auth.users u on u.id = l.owner_id
  where l.creation_fingerprint = ${quote(fingerprint)} and lower(u.email) = lower(${quote(owner)});
${values.commit ? "commit" : "rollback"};
`;
  await writeFile(resolve(values.out), sql);
  console.log(
    `Wrote ${values.out}: ${questionCount} questions for ${owner}, ${audio.assets.length} with audio (${values.commit ? "commit" : "dry run, rollback"}).`,
  );
  if (audio.missing.length) {
    console.warn(
      `${audio.missing.length} questions have no audio yet; the teacher can publish once it is generated and registered.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to write the listening SQL.");
  process.exit(1);
});
