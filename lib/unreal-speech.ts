import { setTimeout as delay } from "node:timers/promises";

import { UNREAL_FORMAT, unrealVoiceId } from "@/lib/audio-config";

import type { AudioConfig } from "@/lib/audio-config";

export interface UnrealSpeechOptions {
  key: string;
  fetcher?: typeof fetch;
  wait?: (milliseconds: number) => Promise<void>;
}

// One short text (listening transcripts are at most 500 characters) as an MP3 from the /stream
// endpoint. The key only goes in the Authorization header and never into errors or logs.
export async function synthesizeUnrealSpeech(
  config: AudioConfig,
  { key, fetcher = fetch, wait = delay }: UnrealSpeechOptions,
): Promise<Buffer> {
  const voiceId = unrealVoiceId(config.voice);
  if (!voiceId || config.format !== UNREAL_FORMAT || !key) {
    throw new Error("Unreal Speech needs an unreal:<voice> config and an API key.");
  }
  if (config.text.length > 1000) {
    throw new Error("Unreal Speech reads at most 1,000 characters per request.");
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetcher("https://api.v8.unrealspeech.com/stream", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        Text: config.text,
        VoiceId: voiceId,
        Bitrate: "64k",
        Speed: "0",
        Pitch: "1",
        Codec: "libmp3lame",
      }),
    });
    if (response.ok && response.headers.get("content-type")?.includes("audio")) {
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 100) {
        throw new Error("Unreal Speech returned empty or unexpectedly short audio.");
      }
      return bytes;
    }
    const isRetryable = response.status === 429 || response.status >= 500;
    const detail = (await response.text().catch(() => "")).slice(0, 160);
    if (isRetryable && attempt < 2) {
      await wait(1000 * 2 ** attempt);
      continue;
    }
    throw new Error(`Unreal Speech request failed (${response.status}): ${detail}`);
  }
  throw new Error("Unreal Speech request failed after retries.");
}
