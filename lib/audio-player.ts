import type { KanaItem } from "./kana";

export type SpeechLocale = "ja-JP" | "zh-CN" | "zh-TW";

export interface SpokenItem {
  id: string;
  text: string;
  label: string;
  audio: string | null;
  locale?: SpeechLocale;
}

interface DeviceVoice {
  pattern: RegExp;
  name: string;
}

// Never fall back to another language: Chinese text read by a Japanese voice teaches wrong sounds.
const DEVICE_VOICES: Record<SpeechLocale, DeviceVoice> = {
  "ja-JP": { pattern: /^ja(?:-|$)/i, name: "Nhật" },
  "zh-CN": { pattern: /^(?:zh|cmn)[-_](?:CN|Hans)/i, name: "Trung (giản thể)" },
  "zh-TW": { pattern: /^(?:zh|cmn)[-_](?:TW|Hant)/i, name: "Trung (phồn thể)" },
};

export type AudioPlayable = KanaItem | SpokenItem;

export interface AudioPlayerState {
  status: "idle" | "loading" | "playing" | "done" | "error";
  message: string;
  itemId: string | null;
}

export interface AudioPlayerOptions {
  assets: Record<string, string>;
  baseUrl: string;
  lessonBaseUrl?: string;
  onStateChange: (state: AudioPlayerState) => void;
}

export interface AudioPlayer {
  play: (item: AudioPlayable) => void;
  reset: () => void;
  dispose: () => void;
}

export const INITIAL_AUDIO_STATE: AudioPlayerState = {
  status: "idle",
  message: "Chọn một chữ để nghe cách đọc.",
  itemId: null,
};

export function createAudioPlayer({
  assets,
  baseUrl,
  lessonBaseUrl = "/audio/lessons",
  onStateChange,
}: AudioPlayerOptions): AudioPlayer {
  let generation = 0;
  let isDisposed = false;
  let cleanup = () => {};

  function stopPlayback() {
    generation++;
    cleanup();
    cleanup = () => {};
  }

  function play(item: AudioPlayable) {
    if (isDisposed) {
      return;
    }

    stopPlayback();
    const requestId = generation;
    const isCurrentRequest = () => !isDisposed && generation === requestId;

    function update(status: AudioPlayerState["status"], message: string) {
      if (isCurrentRequest()) {
        onStateChange({ status, message, itemId: item.id });
      }
    }

    function fail(message: string) {
      if (!isCurrentRequest()) {
        return;
      }

      update("error", message);
      stopPlayback();
    }

    const label = "kana" in item ? item.acceptedRomaji[0] : item.label;
    const spokenText = "kana" in item ? item.kana : item.text;
    const locale = ("kana" in item ? undefined : item.locale) ?? "ja-JP";
    const deviceVoice = DEVICE_VOICES[locale];
    const practiceHint = locale === "ja-JP" ? "luyện romaji" : "luyện theo pinyin";
    update("loading", `Đang chuẩn bị âm ${label}…`);
    const hash = item.audio || assets[item.id];

    if (hash) {
      const base = ("kana" in item ? baseUrl : lessonBaseUrl).replace(/\/$/, "");
      const isLocalPath = base.startsWith("/") && !base.startsWith("//");

      if (!isLocalPath && !/^https:\/\//.test(base)) {
        fail("Nguồn audio chưa được cấu hình đúng. Bạn vẫn có thể luyện chữ.");
        return;
      }

      const audio = new Audio(`${base}/${hash}.mp3`);
      const timeout = window.setTimeout(() => {
        fail("Chưa tải được audio. Kiểm tra mạng rồi bấm Nghe lại.");
      }, 10000);

      audio.onplaying = () => {
        window.clearTimeout(timeout);
        update("playing", `Đang phát âm ${label}.`);
      };
      audio.onended = () => update("done", `Đã phát âm ${label}.`);
      audio.onerror = () => fail("Chưa tải được audio. Kiểm tra mạng rồi bấm Nghe lại.");

      cleanup = () => {
        window.clearTimeout(timeout);
        audio.onplaying = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.removeAttribute("src");
      };

      void audio.play().catch(() => fail("Chưa tải được audio. Kiểm tra mạng rồi bấm Nghe lại."));
      return;
    }

    if (!("speechSynthesis" in window)) {
      fail(`Chưa có MP3 và thiết bị không hỗ trợ đọc chữ. Bạn vẫn có thể ${practiceHint}.`);
      return;
    }

    const speech = window.speechSynthesis;
    let speechTimeout: number | undefined;
    let utterance: SpeechSynthesisUtterance | null = null;

    function clearVoiceLookup() {
      window.clearTimeout(voiceTimeout);
      speech.removeEventListener("voiceschanged", playDeviceVoice);
    }

    function playDeviceVoice() {
      if (!isCurrentRequest() || utterance) {
        return;
      }

      const voice = speech
        .getVoices()
        .find((candidate) => deviceVoice.pattern.test(candidate.lang));

      if (!voice) {
        return;
      }

      clearVoiceLookup();
      utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = locale;
      utterance.voice = voice;
      utterance.rate = 0.8;
      utterance.onstart = () =>
        update("playing", `Đang dùng giọng ${deviceVoice.name} của thiết bị (dự phòng).`);
      utterance.onend = () => {
        window.clearTimeout(speechTimeout);
        update("done", `Đã phát bằng giọng ${deviceVoice.name} của thiết bị (dự phòng).`);
      };
      utterance.onerror = () => fail("Giọng thiết bị chưa phát được. Bấm Nghe lại để thử.");
      speechTimeout = window.setTimeout(() => {
        fail(`Giọng thiết bị không phản hồi. Bạn vẫn có thể ${practiceHint}.`);
      }, 10000);

      try {
        speech.speak(utterance);
      } catch {
        fail("Giọng thiết bị chưa phát được. Bấm Nghe lại để thử.");
      }
    }

    cleanup = () => {
      clearVoiceLookup();
      window.clearTimeout(speechTimeout);

      if (utterance) {
        utterance.onstart = null;
        utterance.onend = null;
        utterance.onerror = null;
      }

      speech.cancel();
    };

    speech.addEventListener("voiceschanged", playDeviceVoice);
    const voiceTimeout = window.setTimeout(() => {
      fail(
        `Thiết bị chưa có giọng ${deviceVoice.name} và MP3 chưa được cấu hình. Bạn vẫn có thể ${practiceHint}.`,
      );
    }, 1500);
    playDeviceVoice();
  }

  return {
    play,
    reset() {
      stopPlayback();

      if (!isDisposed) {
        onStateChange(INITIAL_AUDIO_STATE);
      }
    },
    dispose() {
      isDisposed = true;
      stopPlayback();
    },
  };
}
