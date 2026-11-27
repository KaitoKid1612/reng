// The public Supabase Storage bucket production plays lesson audio from
// (scripts/upload-lesson-audio.ts fills it from public/audio/lessons).
export const LESSON_AUDIO_BUCKET = "lesson-audio";

// Lesson audio is public and immutable (hash-named); the base comes from the build environment:
// the bucket's public URL in production, the files in public/audio/lessons elsewhere.
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
