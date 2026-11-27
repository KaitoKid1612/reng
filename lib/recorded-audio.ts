import { createHash } from "node:crypto";

import { LISTENING_AUDIO_FOLDER } from "@/lib/listening-set";

// Listening clips cut from a supplied recording (one MP3 per question) instead of a synthetic
// voice. The file is named by its own content: the first 32 hex digits of its SHA-256, so a
// re-cut clip gets a new name and never replaces audio a published lesson already plays.
export const RECORDED_AUDIO_VOICE = "recording";
export const RECORDED_AUDIO_FORMAT = "recorded-mp3";

export function recordedAudioHash(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 32);
}

/** The audio_assets rows of a test's recorded clips; the transcript stands in for the text. */
export function recordedAudioRows(
  testId: string,
  questions: readonly { id: string; type: string; audio?: string | null; transcript?: string }[],
) {
  return questions.flatMap((question) => {
    if (!question.audio || question.transcript === undefined) {
      return [];
    }
    const config = {
      text: question.transcript,
      locale: "ja-JP",
      voice: RECORDED_AUDIO_VOICE,
      format: RECORDED_AUDIO_FORMAT,
      source: `${testId}:${question.id}`,
    };
    return [
      {
        hash: question.audio,
        text: question.transcript,
        voice: RECORDED_AUDIO_VOICE,
        url: `/${LISTENING_AUDIO_FOLDER}/${question.audio}.mp3`,
        config,
      },
    ];
  });
}
