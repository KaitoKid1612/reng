import { z } from "zod";

import { draftContentSchema, draftMetadataSchema } from "@/lib/lesson-draft";
import { applyContentAudio, planContentAudio } from "@/lib/lesson-audio";

// A listening set file (content/listening/*.json): lesson metadata and listening or dictation
// questions in draft form, so audio stays null until it is generated. Generated audio is served
// with the web from public/audio/lessons, and the file records each question's hash.
export const LISTENING_AUDIO_FOLDER = "audio/lessons";
export const DEFAULT_LISTENING_VOICE = "ja-JP-NanamiNeural";

const listeningSetSchema = draftMetadataSchema.extend({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  // The voice the recorded audio was made with, so its hashes can be checked again later.
  audioVoice: z.string().optional(),
  content: draftContentSchema,
});

export type ListeningSet = z.infer<typeof listeningSetSchema>;

export function parseListeningSet(value: unknown): ListeningSet {
  const set = listeningSetSchema.parse(value);
  const { questions } = set.content;
  if (
    !questions.length ||
    questions.some((question) => question.type !== "listen" && question.type !== "dictation")
  ) {
    throw new Error("A listening set holds listening and dictation questions only.");
  }
  return set;
}

export function planListeningAudio(set: ListeningSet, voice = DEFAULT_LISTENING_VOICE) {
  return planContentAudio(set.id, set.content, voice);
}

// The set with the hashes of audio generated with one voice; it records that voice.
export function applyListeningAudio(
  set: ListeningSet,
  assets: Record<string, string>,
  voice = DEFAULT_LISTENING_VOICE,
): ListeningSet {
  return { ...set, audioVoice: voice, content: applyContentAudio(set.id, set.content, assets) };
}

// Audio recorded in the file must still match its transcript and voice; a transcript edited
// after the audio was made needs new audio, or learners would hear the old sentence.
export function findListeningAudio(
  set: ListeningSet,
  voice = set.audioVoice ?? DEFAULT_LISTENING_VOICE,
) {
  const planned = new Map(planListeningAudio(set, voice).map((asset) => [asset.itemId, asset]));
  const assets = [];
  const stale = [];
  const missing = [];
  for (const question of set.content.questions) {
    if (question.type !== "listen" && question.type !== "dictation") {
      continue;
    }
    const asset = planned.get(`${set.id}:question:${question.id}`);
    if (!question.audio) {
      missing.push(question.id);
    } else if (!asset || asset.hash !== question.audio) {
      stale.push(question.id);
    } else {
      assets.push(asset);
    }
  }
  return { assets, stale, missing };
}

// Audio that ships with the web for listening sets, keyed by hash, as audio_assets rows. A lesson
// that takes these questions can publish without anyone registering the audio by hand.
export function listeningAudioRegistry(sets: readonly ListeningSet[]) {
  const rows = new Map<
    string,
    { hash: string; text: string; voice: string; url: string; config: unknown }
  >();
  for (const set of sets) {
    for (const asset of findListeningAudio(set).assets) {
      rows.set(asset.hash, {
        hash: asset.hash,
        text: asset.config.text,
        voice: asset.config.voice,
        url: `/${LISTENING_AUDIO_FOLDER}/${asset.hash}.mp3`,
        config: asset.config,
      });
    }
  }
  return rows;
}
