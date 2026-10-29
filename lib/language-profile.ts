export const GRADING_PROFILES = ["ja-default-v1", "zh-exact-v1"] as const;
export type GradingProfile = (typeof GRADING_PROFILES)[number];

export function normalizeForProfile(value: string, profile: GradingProfile) {
  if (profile === "zh-exact-v1") {
    return value.normalize("NFC").trim();
  }
  return value
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[。．.]$/, "");
}
