import { rm } from "node:fs/promises";

// Vercel build step: when production plays lesson audio from Supabase Storage
// (NEXT_PUBLIC_LESSON_AUDIO_BASE_URL is an https URL), the MP3s in public/audio/lessons are left
// out of the deployment, so each deployment stays small. Without that variable, or outside Vercel,
// nothing is removed and the web keeps serving the files itself.
const base = process.env.NEXT_PUBLIC_LESSON_AUDIO_BASE_URL ?? "";
if (process.env.VERCEL && base.startsWith("https://")) {
  await rm("public/audio/lessons", { recursive: true, force: true });
  console.log(`Lesson audio is served from ${base}; public/audio/lessons left out of the build.`);
} else {
  console.log("Lesson audio ships in public/audio/lessons.");
}
