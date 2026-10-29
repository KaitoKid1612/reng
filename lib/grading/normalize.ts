import { normalizeForProfile } from "@/lib/language-profile";

import type { GradingProfile } from "@/lib/language-profile";

// The default preserves every existing Japanese assignment's grading contract.
export function normalizeAnswer(value: string, profile: GradingProfile = "ja-default-v1") {
  return normalizeForProfile(value, profile);
}
