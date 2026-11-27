import n4Test202507 from "@/content/jlpt/tests/n4-2025-07.json";
import n4Test202512 from "@/content/jlpt/tests/n4-2025-12.json";
import n4Test202607 from "@/content/jlpt/tests/n4-2026-07.json";
import n4Test2026072 from "@/content/jlpt/tests/n4-2026-07-2.json";

// Whole tests the owner supplied (content/jlpt/tests/): taken whole like an official workbook
// test and printable. Their listening, when they have one, plays clips cut from their own
// recording (lib/recorded-audio.ts). n4-2026-07 is a book's written part only; n4-2026-07-2 is the
// same book's second test, its listening script read by a synthetic voice (a bundled set).
export const JLPT_TEST_FILES = [n4Test202507, n4Test202512, n4Test202607, n4Test2026072] as const;
