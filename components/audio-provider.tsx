"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Volume2 } from "lucide-react";

import { createAudioPlayer, INITIAL_AUDIO_STATE } from "@/lib/audio-player";

import type { AudioPlayable, AudioPlayer, AudioPlayerState } from "@/lib/audio-player";
import type { ReactNode } from "react";

interface AudioContextValue extends AudioPlayerState {
  play: (item: AudioPlayable) => void;
  reset: () => void;
}

interface AudioProviderProps {
  assets: Record<string, string>;
  children: ReactNode;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ assets, children }: AudioProviderProps) {
  const pathname = usePathname();

  return (
    <AudioSession key={pathname} assets={assets}>
      {children}
    </AudioSession>
  );
}

function AudioSession({ assets, children }: AudioProviderProps) {
  const [state, setState] = useState<AudioPlayerState>(INITIAL_AUDIO_STATE);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => () => playerRef.current?.dispose(), []);

  function handlePlay(item: AudioPlayable) {
    if (!playerRef.current) {
      playerRef.current = createAudioPlayer({
        assets,
        baseUrl: process.env.NEXT_PUBLIC_AUDIO_BASE_URL || "/audio/kana",
        lessonBaseUrl: process.env.NEXT_PUBLIC_LESSON_AUDIO_BASE_URL || "/audio/lessons",
        onStateChange: setState,
      });
    }

    playerRef.current.play(item);
  }

  function handleReset() {
    playerRef.current?.reset();
  }

  return (
    <AudioContext.Provider value={{ ...state, play: handlePlay, reset: handleReset }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);

  if (!context) {
    throw new Error("useAudio must be used within AudioProvider.");
  }

  return context;
}

export function AudioStatus() {
  const { message, status } = useAudio();

  return (
    <p className={`audio-status ${status === "error" ? "audio-error" : ""}`} role="status">
      <Volume2 size={16} aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
