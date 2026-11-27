import n4Test202507 from "@/content/jlpt/tests/n4-2025-07.json";
import n4Test202512 from "@/content/jlpt/tests/n4-2025-12.json";

// Whole tests the owner supplied (content/jlpt/tests/): taken whole like an official workbook
// test, printable, and played with clips cut from their own recording (lib/recorded-audio.ts).
export const JLPT_TEST_FILES = [n4Test202507, n4Test202512] as const;
