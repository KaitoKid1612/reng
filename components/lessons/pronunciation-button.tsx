"use client";

import { Volume2 } from "lucide-react";

import { useAudio } from "@/components/audio-provider";
import { Button } from "@/components/ui/button";

interface PronunciationButtonProps {
  id: string;
  text: string;
  label: string;
  audio: string | null;
}

export function PronunciationButton({ id, text, label, audio }: PronunciationButtonProps) {
  const player = useAudio();
  return (
    <Button
      variant="ghost"
      className="pronunciation-button"
      aria-label={`Nghe ${label}`}
      onClick={() => player.play({ id, text, label, audio })}
    >
      <Volume2 size={18} aria-hidden="true" />
      <span>Nghe</span>
    </Button>
  );
}
