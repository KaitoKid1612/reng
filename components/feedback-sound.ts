"use client";

// Short tones for a right answer, a wrong one and a perfect session, made with Web Audio so no
// sound files are downloaded. On by default; the choice is kept per browser.
export type FeedbackSound = "correct" | "wrong" | "complete";

const SOUND_KEY = "reng-sound";
export const SOUND_CHANGE_EVENT = "reng-sound-change";

// Frequencies in Hz, played one after another.
const MELODIES: Record<FeedbackSound, readonly number[]> = {
  correct: [659, 988],
  wrong: [247, 208],
  complete: [523, 659, 784, 1047],
};
const NOTE_SECONDS = 0.11;
const VOLUME = 0.06;

let audioContext: AudioContext | null = null;

export function isSoundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveSoundOn(isOn: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, isOn ? "on" : "off");
  } catch {
    // Blocked storage: the choice lasts until the page reloads.
  }
  window.dispatchEvent(new Event(SOUND_CHANGE_EVENT));
}

// Called right after the learner's own action, so the browser allows audio to start.
export function playFeedbackSound(sound: FeedbackSound) {
  if (!isSoundOn() || typeof AudioContext === "undefined") {
    return;
  }
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
    const start = audioContext.currentTime;
    MELODIES[sound].forEach((frequency, index) => {
      if (!audioContext) {
        return;
      }
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const noteStart = start + index * NOTE_SECONDS;
      oscillator.type = sound === "wrong" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(VOLUME, noteStart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + NOTE_SECONDS * 1.6);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + NOTE_SECONDS * 1.8);
    });
  } catch {
    // Sound is a nicety; a browser without audio still shows the feedback.
  }
}
