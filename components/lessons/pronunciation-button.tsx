"use client";

import { Volume2 } from "lucide-react";

import { useAudio } from "@/components/audio-provider";
import { Button } from "@/components/ui/button";

import type { SpeechLocale } from "@/lib/audio-player";

interface PronunciationButtonProps {
  id: string;
  text: string;
  label: string;
  audio: string | null;
  locale?: SpeechLocale;
}

export function PronunciationButton({ id, text, label, audio, locale }: PronunciationButtonProps) {
  const player = useAudio();
  return (
    <Button
      variant="ghost"
      className="pronunciation-button"
      aria-label={`Nghe ${label}`}
      onClick={() => player.play({ id, text, label, audio, locale })}
    >
      <Volume2 size={18} aria-hidden="true" />
      <span>Nghe</span>
    </Button>
  );
}
