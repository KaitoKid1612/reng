import { setTimeout as delay } from "node:timers/promises";

import { ssml } from "./audio-config";

import type { AudioConfig } from "./audio-config";

export interface AzureSpeechOptions {
  region: string;
  key: string;
  fetcher?: typeof fetch;
  wait?: (milliseconds: number) => Promise<void>;
}

export async function synthesizeSpeech(
  config: AudioConfig,
  { region, key, fetcher = fetch, wait = delay }: AzureSpeechOptions,
): Promise<Buffer> {
  if (!/^[a-z0-9-]+$/.test(region) || !key) {
    throw new Error("Azure speech requires a valid region code and subscription key.");
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetcher(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": config.format,
          "User-Agent": "RengAudioPipeline",
        },
        body: ssml(config),
      },
    );

    if (response.ok) {
      const bytes = Buffer.from(await response.arrayBuffer());

      if (bytes.length < 100) {
        throw new Error("Azure returned empty or unexpectedly short audio.");
      }

      return bytes;
    }

    const isRetryable = response.status === 429 || response.status >= 500;

    if (isRetryable && attempt < 2) {
      const retrySeconds = Number(response.headers.get("retry-after"));
      const waitMilliseconds =
        Number.isFinite(retrySeconds) && retrySeconds > 0
          ? Math.min(retrySeconds * 1000, 10000)
          : 1000 * 2 ** attempt;

      await response.body?.cancel();
      await wait(waitMilliseconds);
      continue;
    }

    await response.body?.cancel();
    throw new Error(
      `Azure TTS failed with HTTP ${response.status}. Response contents and credentials are omitted.`,
    );
  }

  throw new Error("Azure retry limit reached.");
}
