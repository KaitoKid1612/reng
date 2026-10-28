import { createHash } from "node:crypto";

export interface AudioConfig {
  text: string;
  locale: string;
  voice: string;
  rate: string;
  pitch: string;
  format: string;
  pipelineVersion: number;
}
export function canonicalAudio(text: string, voice = "ja-JP-NanamiNeural"): AudioConfig {
  if (!/^ja-JP-[A-Za-z]+Neural$/.test(voice)) {
    throw new Error("Voice must be a valid ja-JP Neural voice.");
  }
  return {
    text,
    locale: "ja-JP",
    voice,
    rate: "0%",
    pitch: "0%",
    format: "audio-16khz-64kbitrate-mono-mp3",
    pipelineVersion: 1,
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
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 32);
}
export function escapeXml(text: string) {
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
