import n4Test202507 from "@/content/jlpt/tests/n4-2025-07.json";
import n4Test202512 from "@/content/jlpt/tests/n4-2025-12.json";
import n4Test202607 from "@/content/jlpt/tests/n4-2026-07.json";
import n4Test202607Exam from "@/content/jlpt/tests/n4-2026-07-exam.json";
import n4Test2026072 from "@/content/jlpt/tests/n4-2026-07-2.json";

// Whole tests the owner supplied (content/jlpt/tests/), taken whole like an official workbook test
// and printable: the real N4 tests of 07/2025, 12/2025 and 07/2026 (listening cut from their own
// recordings, lib/recorded-audio.ts), then a reference book's practice tests: n4-2026-07 (Đề 1,
// written part only) and n4-2026-07-2 (Đề 2, its script read by synthetic voices).
export const JLPT_TEST_FILES = [
  n4Test202507,
  n4Test202512,
  n4Test202607Exam,
  n4Test202607,
  n4Test2026072,
] as const;
