import { audioHash, canonicalAudio } from "./audio-config";
import { lessonDraftSchema } from "./lesson-schema";

import type { PlannedAudioAsset } from "./audio-generation";
import type { LessonDraft } from "./lesson-schema";

export function planLessonAudio(drafts: LessonDraft[], voice: string): PlannedAudioAsset[] {
  return drafts.flatMap((draft) => [
    ...draft.content.vocab.map((item) => {
      const config = canonicalAudio(item.jp, voice);
      return { itemId: `${draft.id}:vocab:${item.id}`, hash: audioHash(config), config };
    }),
    ...draft.content.grammar.flatMap((grammar) =>
      grammar.examples.map((example, index) => {
        const config = canonicalAudio(example.jp, voice);
        return {
          itemId: `${draft.id}:grammar:${grammar.id}:${index}`,
          hash: audioHash(config),
          config,
        };
      }),
    ),
  ]);
}

export function applyLessonAudio(draft: LessonDraft, assets: Record<string, string>): LessonDraft {
  const next = structuredClone(draft);
  for (const item of next.content.vocab) {
    item.audio = assets[`${draft.id}:vocab:${item.id}`] || item.audio;
  }
  for (const grammar of next.content.grammar) {
    grammar.examples.forEach((example, index) => {
      example.audio = assets[`${draft.id}:grammar:${grammar.id}:${index}`] || example.audio;
    });
  }
  return lessonDraftSchema.parse(next);
}
