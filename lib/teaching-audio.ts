import { audioHash, canonicalAudio } from "@/lib/audio-config";

import type { PlannedAudioAsset } from "@/lib/audio-generation";
import type { ChineseLanguageTag, TeachingDraftContent } from "@/lib/teaching-content";

// Simplified script is read with a mainland voice, traditional script with a Taiwan voice.
export const DEFAULT_CHINESE_VOICES: Record<ChineseLanguageTag, string> = {
  "zh-Hans": "zh-CN-XiaoxiaoNeural",
  "zh-Hant": "zh-TW-HsiaoChenNeural",
};

type AudioContent = Pick<TeachingDraftContent, "context" | "vocab" | "dialogue">;

function planned(itemId: string, text: string, voice: string): PlannedAudioAsset {
  const config = canonicalAudio(text, voice);
  return { itemId, hash: audioHash(config), config };
}

// Words and dialogue lines of a Chinese lesson, which the reader and slides play when present;
// unfinished (blank) items are skipped.
export function planTeachingAudio(
  lessonId: string,
  content: AudioContent,
  voices: Record<ChineseLanguageTag, string> = DEFAULT_CHINESE_VOICES,
): PlannedAudioAsset[] {
  const voice = voices[content.context.languageTag];
  return [
    ...content.vocab
      .filter((item) => item.text.trim())
      .map((item) => planned(`${lessonId}:vocab:${item.id}`, item.text.trim(), voice)),
    ...content.dialogue
      .filter((line) => line.text.trim())
      .map((line) => planned(`${lessonId}:dialogue:${line.id}`, line.text.trim(), voice)),
  ];
}

export function applyTeachingAudio<Content extends AudioContent>(
  lessonId: string,
  content: Content,
  assets: Record<string, string>,
): Content {
  const next = structuredClone(content);
  for (const item of next.vocab) {
    item.audio = assets[`${lessonId}:vocab:${item.id}`] || item.audio;
  }
  for (const line of next.dialogue) {
    line.audio = assets[`${lessonId}:dialogue:${line.id}`] || line.audio;
  }
  return next;
}
