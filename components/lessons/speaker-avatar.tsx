import Image from "next/image";

import { CHARACTER_PICTURES } from "@/lib/characters";
import { toPlainJapanese } from "@/lib/japanese-text";

interface SpeakerAvatarProps {
  speaker: string;
}

// The speaker's name is written next to the avatar, so the avatar itself is decorative.
export function SpeakerAvatar({ speaker }: SpeakerAvatarProps) {
  const name = toPlainJapanese(speaker);
  const picture = CHARACTER_PICTURES[name];
  if (picture) {
    return (
      <Image src={picture} alt="" width={64} height={64} unoptimized className="speaker-avatar" />
    );
  }
  return (
    <span className="speaker-avatar" aria-hidden="true" lang="ja">
      {[...name][0] ?? ""}
    </span>
  );
}
