export const TEACHING_LANGUAGE_LABELS = {
  "ja-JP": "Tiếng Nhật",
  "zh-Hans": "Tiếng Trung giản thể",
  "zh-Hant": "Tiếng Trung phồn thể",
} as const;

export type TeachingLanguageTag = keyof typeof TEACHING_LANGUAGE_LABELS;

export function isTeachingLanguage(value: string): value is TeachingLanguageTag {
  return Object.hasOwn(TEACHING_LANGUAGE_LABELS, value);
}

// Unknown/new schemas must not be silently presented as Japanese lessons.
export function lessonLanguage(schemaVersion: string | null, languageTag: string | null) {
  if (schemaVersion === "1") {
    return "ja-JP" as const;
  }
  if (schemaVersion === "2" && (languageTag === "zh-Hans" || languageTag === "zh-Hant")) {
    return languageTag;
  }
  return null;
}

export function teachingLanguageLabel(languageTag: TeachingLanguageTag | null) {
  return languageTag ? TEACHING_LANGUAGE_LABELS[languageTag] : "Chưa xác định ngôn ngữ";
}
