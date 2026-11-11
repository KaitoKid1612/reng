import { createHash } from "node:crypto";

export interface AudioSegment {
  text: string;
  voice: string;
}

export interface AudioConfig {
  text: string;
  locale: string;
  voice: string;
  rate: string;
  pitch: string;
  format: string;
  pipelineVersion: number;
  /** A dialogue: one segment per turn, each read in its speaker's voice and joined in order. */
  segments?: AudioSegment[];
}
// Japanese lessons and Chinese lessons in simplified (zh-CN) or traditional (zh-TW) script. The
// locale comes from the voice, so existing Japanese hashes stay the same.
const VOICE_PATTERN = /^(ja-JP|zh-CN|zh-TW)-[A-Za-z]+Neural$/;

// Unreal Speech voices that read Japanese, written "unreal:<VoiceId>". Their audio gets its own
// hashes, so it never takes the place of an Azure file with the same text.
export const UNREAL_JAPANESE_VOICES = ["Haruto", "Rina", "Yuki", "Hana", "Sakura"] as const;
export const UNREAL_FORMAT = "unreal-64k-mp3";

export function unrealVoiceId(voice: string) {
  const id = voice.startsWith("unreal:") ? voice.slice("unreal:".length) : null;
  return id && (UNREAL_JAPANESE_VOICES as readonly string[]).includes(id) ? id : null;
}

export function canonicalAudio(text: string, voice = "ja-JP-NanamiNeural"): AudioConfig {
  if (voice.startsWith("unreal:")) {
    if (!unrealVoiceId(voice)) {
      throw new Error(`Unreal voice must be one of ${UNREAL_JAPANESE_VOICES.join(", ")}.`);
    }
    return {
      text,
      locale: "ja-JP",
      voice,
      rate: "0%",
      pitch: "0%",
      format: UNREAL_FORMAT,
      pipelineVersion: 1,
    };
  }
  const locale = VOICE_PATTERN.exec(voice)?.[1];
  if (!locale) {
    throw new Error("Voice must be a ja-JP, zh-CN or zh-TW Neural voice.");
  }
  return {
    text,
    locale,
    voice,
    rate: "0%",
    pitch: "0%",
    format: "audio-16khz-64kbitrate-mono-mp3",
    pipelineVersion: 1,
  };
}
/**
 * One audio file for several turns read in different voices. All voices must come from one
 * service, so the parts share an MP3 format and can be joined.
 */
export function canonicalDialogueAudio(segments: readonly AudioSegment[]): AudioConfig {
  const parts = segments.map((segment) => canonicalAudio(segment.text, segment.voice));
  const [first] = parts;
  if (
    !first ||
    parts.some((part) => part.format !== first.format || part.locale !== first.locale)
  ) {
    throw new Error("A dialogue needs turns read by voices of one service and one language.");
  }
  return {
    text: parts.map((part) => part.text).join("\n"),
    locale: first.locale,
    voice: [...new Set(parts.map((part) => part.voice))].join("+"),
    rate: first.rate,
    pitch: first.pitch,
    format: first.format,
    pipelineVersion: first.pipelineVersion,
    segments: parts.map((part) => ({ text: part.text, voice: part.voice })),
  };
}

export function audioHash(config: AudioConfig): string {
  const canonical = {
    text: config.text,
    locale: config.locale,
    voice: config.voice,
    rate: config.rate,
    pitch: config.pitch,
    format: config.format,
    pipelineVersion: config.pipelineVersion,
    // Single-voice audio keeps the hash it had before dialogues existed.
    ...(config.segments ? { segments: config.segments } : {}),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 32);
}
function escapeXml(text: string) {
  return text.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  );
}
export function ssml(config: AudioConfig) {
  return `<speak version="1.0" xml:lang="${escapeXml(config.locale)}"><voice name="${escapeXml(config.voice)}"><prosody rate="${escapeXml(config.rate)}" pitch="${escapeXml(config.pitch)}">${escapeXml(config.text)}</prosody></voice></speak>`;
}
