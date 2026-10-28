// Lesson audio is public and immutable (hash-named); the base comes from the build environment.
export function lessonAudioUrl(hash: string | null) {
  if (!hash) {
    return null;
  }
  const base = (process.env.NEXT_PUBLIC_LESSON_AUDIO_BASE_URL || "/audio/lessons").replace(
    /\/$/,
    "",
  );
  return `${base}/${hash}.mp3`;
}
