"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";

import { isSoundOn, saveSoundOn, SOUND_CHANGE_EVENT } from "@/components/feedback-sound";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SOUND_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SOUND_CHANGE_EVENT, onChange);
  };
}

function getServerSoundOn() {
  return true;
}

// A small switch beside practice, where the right/wrong tones play.
export function SoundToggle() {
  const isOn = useSyncExternalStore(subscribe, isSoundOn, getServerSoundOn);
  const label = "Âm thanh khi trả lời";
  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={isOn}
      aria-label={label}
      title={isOn ? `${label}: đang bật` : `${label}: đang tắt`}
      onClick={() => saveSoundOn(!isOn)}
    >
      {isOn ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
    </button>
  );
}
