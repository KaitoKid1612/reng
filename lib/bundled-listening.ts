import minnaListening from "@/content/listening/minna-1-15.json";
import n4DailyListening from "@/content/listening/n4-daily.json";
import n4MockListening from "@/content/listening/n4-viet-listening-mock-20.json";
import n5DailyListening from "@/content/listening/n5-daily-1-13.json";
import { listeningAudioRegistry, parseListeningSet } from "@/lib/listening-set";

// Listening sets whose MP3s ship with the web (public/audio/lessons). A lesson or review bank
// that takes their questions registers the audio from here, so nobody runs an audio script.
export const BUNDLED_LISTENING_SETS = [
  minnaListening,
  n4DailyListening,
  n4MockListening,
  n5DailyListening,
].map((set) => parseListeningSet(set));

export const BUNDLED_LISTENING_AUDIO = listeningAudioRegistry(BUNDLED_LISTENING_SETS);
