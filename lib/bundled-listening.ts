import officialN4Listening2012 from "@/content/listening/jlpt-official-n4-2012.json";
import officialN4Listening from "@/content/listening/jlpt-official-n4-2018.json";
import officialN5Listening2012 from "@/content/listening/jlpt-official-n5-2012.json";
import officialN5Listening from "@/content/listening/jlpt-official-n5-2018.json";
import minnaListening from "@/content/listening/minna-1-15.json";
import n4DailyListening from "@/content/listening/n4-daily.json";
import n4MockListening from "@/content/listening/n4-viet-listening-mock-20.json";
import n4ExamAdvancedListening from "@/content/listening/n4-reng-exam-advanced.json";
import n4ExamStandardListening from "@/content/listening/n4-reng-exam-standard.json";
import n4Test202507 from "@/content/jlpt/tests/n4-2025-07.json";
import n4MockMoreListening from "@/content/listening/n4-viet-listening-mock-21-60.json";
import n5DailyListening from "@/content/listening/n5-daily-1-13.json";
import n5MockListening from "@/content/listening/n5-viet-listening-mock-40.json";
import n5MockMoreListening from "@/content/listening/n5-viet-listening-mock-41-72.json";
import { lessonDraftSchema } from "@/lib/lesson-schema";
import { listeningAudioRegistry, parseListeningSet } from "@/lib/listening-set";
import { recordedAudioRows } from "@/lib/recorded-audio";

// Listening sets whose MP3s ship with the web (public/audio/lessons). A lesson or review bank
// that takes their questions registers the audio from here, so nobody runs an audio script.
const BUNDLED_LISTENING_SETS = [
  minnaListening,
  n4DailyListening,
  n4MockListening,
  n4MockMoreListening,
  n4ExamStandardListening,
  n4ExamAdvancedListening,
  n5DailyListening,
  n5MockListening,
  n5MockMoreListening,
  officialN5Listening,
  officialN4Listening,
  officialN5Listening2012,
  officialN4Listening2012,
].map((set) => parseListeningSet(set));

// Whole tests whose listening plays clips cut from their own recording (lib/recorded-audio.ts).
export const RECORDED_TESTS = [n4Test202507].map((test) => lessonDraftSchema.parse(test));

export const BUNDLED_LISTENING_AUDIO = listeningAudioRegistry(BUNDLED_LISTENING_SETS);
for (const test of RECORDED_TESTS) {
  for (const row of recordedAudioRows(test.id, test.content.questions)) {
    BUNDLED_LISTENING_AUDIO.set(row.hash, row);
  }
}
