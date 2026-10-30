import Image from "next/image";

import { cn } from "@/lib/utils";

interface VocabPictureProps {
  src: string | undefined;
  size: number;
  className?: string;
}

// The meaning is always written beside the picture, so screen readers skip the image. A path
// still being typed in the editor is not rendered until it can be loaded.
export function VocabPicture({ src, size, className }: VocabPictureProps) {
  const isLoadable = src?.startsWith("/") || src?.startsWith("https://");
  return src && isLoadable ? (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={cn("vocab-picture", className)}
    />
  ) : null;
}
