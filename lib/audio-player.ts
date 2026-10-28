import type { KanaItem } from "./kana";

export interface SpokenItem {
  id: string;
  text: string;
  label: string;
  audio: string | null;
}

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
      fail("Chưa có MP3 và thiết bị không hỗ trợ đọc chữ. Bạn vẫn có thể luyện romaji.");
      return;
    }

    const speech = window.speechSynthesis;
    let speechTimeout: number | undefined;
    let utterance: SpeechSynthesisUtterance | null = null;

    function clearVoiceLookup() {
      window.clearTimeout(voiceTimeout);
      speech.removeEventListener("voiceschanged", playJapaneseVoice);
    }

    function playJapaneseVoice() {
      if (!isCurrentRequest() || utterance) {
        return;
      }

      const voice = speech.getVoices().find((candidate) => /^ja(?:-|$)/i.test(candidate.lang));

      if (!voice) {
        return;
      }

      clearVoiceLookup();
      utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = "ja-JP";
      utterance.voice = voice;
      utterance.rate = 0.8;
      utterance.onstart = () => update("playing", "Đang dùng giọng Nhật của thiết bị (dự phòng).");
      utterance.onend = () => {
        window.clearTimeout(speechTimeout);
        update("done", "Đã phát bằng giọng Nhật của thiết bị (dự phòng).");
      };
      utterance.onerror = () => fail("Giọng thiết bị chưa phát được. Bấm Nghe lại để thử.");
      speechTimeout = window.setTimeout(() => {
        fail("Giọng thiết bị không phản hồi. Bạn vẫn có thể luyện romaji.");
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

    speech.addEventListener("voiceschanged", playJapaneseVoice);
    const voiceTimeout = window.setTimeout(() => {
      fail("Thiết bị chưa có giọng Nhật và MP3 chưa được cấu hình. Bạn vẫn có thể luyện romaji.");
    }, 1500);
    playJapaneseVoice();
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
