import { audioHash, canonicalAudio } from "./audio-config";
import { lessonDraftSchema } from "./lesson-schema";

import type { PlannedAudioAsset } from "./audio-generation";
import type { DraftContent } from "./lesson-draft";
import type { LessonDraft } from "./lesson-schema";

type AudioContent = Pick<DraftContent, "vocab" | "grammar" | "questions">;

function planned(itemId: string, text: string, voice: string): PlannedAudioAsset {
  const config = canonicalAudio(text, voice);
  return { itemId, hash: audioHash(config), config };
}

// Vocabulary, grammar examples and listening transcripts; unfinished (blank) drafts are skipped.
export function planContentAudio(
  lessonId: string,
  content: AudioContent,
  voice: string,
): PlannedAudioAsset[] {
  return [
    ...content.vocab
      .filter((item) => item.jp.trim())
      .map((item) => planned(`${lessonId}:vocab:${item.id}`, item.jp, voice)),
    ...content.grammar.flatMap((grammar) =>
      grammar.examples.flatMap((example, index) =>
        example.jp.trim()
          ? [planned(`${lessonId}:grammar:${grammar.id}:${index}`, example.jp, voice)]
          : [],
      ),
    ),
    ...content.questions.flatMap((question) =>
      (question.type === "listen" || question.type === "dictation") && question.transcript.trim()
        ? [planned(`${lessonId}:question:${question.id}`, question.transcript, voice)]
        : [],
    ),
  ];
}

export function applyContentAudio<Content extends AudioContent>(
  lessonId: string,
  content: Content,
  assets: Record<string, string>,
): Content {
  const next = structuredClone(content);
  for (const item of next.vocab) {
    item.audio = assets[`${lessonId}:vocab:${item.id}`] || item.audio;
  }
  for (const grammar of next.grammar) {
    grammar.examples.forEach((example, index) => {
      example.audio = assets[`${lessonId}:grammar:${grammar.id}:${index}`] || example.audio;
    });
  }
  for (const question of next.questions) {
    if (question.type === "listen" || question.type === "dictation") {
      question.audio = assets[`${lessonId}:question:${question.id}`] || question.audio;
    }
  }
  return next;
}

export function planLessonAudio(drafts: LessonDraft[], voice: string): PlannedAudioAsset[] {
  return drafts.flatMap((draft) => planContentAudio(draft.id, draft.content, voice));
}

export function applyLessonAudio(draft: LessonDraft, assets: Record<string, string>): LessonDraft {
  return lessonDraftSchema.parse({
    ...draft,
    content: applyContentAudio(draft.id, draft.content, assets),
  });
}
