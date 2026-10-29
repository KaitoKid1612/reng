import { toSpeechText } from "@/lib/japanese-text";
import { isTeachingVersion } from "@/lib/teaching-content";

import type { SpeechLocale } from "@/lib/audio-player";
import type { AnyLessonVersion } from "@/lib/teaching-content";

// One display contract for flashcards, reviews and emails. Japanese v1 words map to exactly
// what those screens showed before (kanji or kana, kana reading, romaji, Vietnamese meaning).
export interface StudyWord {
  id: string;
  front: string;
  lang: string;
  reading: string;
  readingLang?: string;
  romanization: string;
  meaning: string;
  spokenText: string;
  audioLabel: string;
  audio: string | null;
  locale: SpeechLocale;
}

export function toStudyWords(version: AnyLessonVersion): StudyWord[] {
  if (isTeachingVersion(version)) {
    const { languageTag, locale } = version.content.context;
    return version.content.vocab.map((item) => ({
      id: item.id,
      front: item.text,
      lang: languageTag,
      reading: item.reading,
      romanization: "",
      meaning: item.meaning,
      spokenText: item.text,
      audioLabel: item.reading || item.text,
      audio: item.audio,
      locale,
    }));
  }
  return version.content.vocab.map((item) => ({
    id: item.id,
    front: item.kanji || item.jp,
    lang: "ja",
    reading: item.kanji && item.kanji !== item.jp ? item.jp : "",
    readingLang: "ja",
    romanization: item.romaji,
    meaning: item.vi,
    spokenText: toSpeechText(item.jp),
    audioLabel: item.romaji,
    audio: item.audio,
    locale: "ja-JP",
  }));
}
