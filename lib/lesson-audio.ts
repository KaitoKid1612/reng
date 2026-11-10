import { audioHash, canonicalAudio, canonicalDialogueAudio } from "@/lib/audio-config";
import { toSpeechText } from "@/lib/japanese-text";
import { lessonDraftSchema } from "@/lib/lesson-schema";
import { splitSpeakerTurns } from "@/lib/listening-dialogue";

import type { PlannedAudioAsset } from "@/lib/audio-generation";
import type { DraftContent } from "@/lib/lesson-draft";
import type { LessonDraft } from "@/lib/lesson-schema";

type AudioContent = Pick<DraftContent, "vocab" | "grammar" | "questions">;

/** The voice of each speaker label in a listening set's dialogues, such as 男 or 女. */
export type SpeakerVoices = Readonly<Record<string, string>>;

function planned(itemId: string, text: string, voice: string): PlannedAudioAsset {
  const config = canonicalAudio(text, voice);
  return { itemId, hash: audioHash(config), config };
}

// A labelled transcript is read turn by turn in each speaker's voice when the set names voices;
// otherwise, or without labels, one voice reads it as before.
function plannedTranscript(
  itemId: string,
  transcript: string,
  voice: string,
  speakerVoices: SpeakerVoices | undefined,
): PlannedAudioAsset {
  const turns = speakerVoices ? splitSpeakerTurns(transcript) : null;
  if (!speakerVoices || !turns) {
    return planned(itemId, toSpeechText(transcript), voice);
  }
  const config = canonicalDialogueAudio(
    turns.map((turn) => {
      const speakerVoice = speakerVoices[turn.speaker];
      if (!speakerVoice) {
        throw new Error(
          `${itemId}: no voice for speaker ${turn.speaker}; add it to speakerVoices.`,
        );
      }
      return { text: toSpeechText(turn.text), voice: speakerVoice };
    }),
  );
  return { itemId, hash: audioHash(config), config };
}

// Vocabulary, grammar examples and listening transcripts; unfinished (blank) drafts are skipped.
export function planContentAudio(
  lessonId: string,
  content: AudioContent,
  voice: string,
  speakerVoices?: SpeakerVoices,
): PlannedAudioAsset[] {
  // Furigana is read as its reading and 〜 is skipped; plain text keeps its existing hash.
  return [
    ...content.vocab
      .filter((item) => item.jp.trim())
      .map((item) => planned(`${lessonId}:vocab:${item.id}`, toSpeechText(item.jp), voice)),
    ...content.grammar.flatMap((grammar) =>
      grammar.examples.flatMap((example, index) =>
        example.jp.trim()
          ? [planned(`${lessonId}:grammar:${grammar.id}:${index}`, toSpeechText(example.jp), voice)]
          : [],
      ),
    ),
    ...content.questions.flatMap((question) =>
      (question.type === "listen" || question.type === "dictation") && question.transcript.trim()
        ? [
            plannedTranscript(
              `${lessonId}:question:${question.id}`,
              question.transcript,
              voice,
              speakerVoices,
            ),
          ]
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
