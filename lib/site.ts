export const SITE_NAME = "Reng";

export const SITE_DESCRIPTION =
  "Lớp học ngoại ngữ online cho giáo viên và học viên Việt Nam: tạo lớp riêng, soạn slide tiếng Nhật và tiếng Trung theo mẫu, dạy qua Google Meet, giao bài tập tự chấm và theo dõi tiến độ.";

const LOCAL_ORIGIN = "http://127.0.0.1:3000";

// Canonical public origin for metadata, sitemap and robots. SITE_URL is also used by emails;
// without it (local development) links stay on this machine.
export function getSiteUrl() {
  const value = process.env.SITE_URL?.trim();
  if (!value) {
    return new URL(LOCAL_ORIGIN);
  }
  try {
    return new URL(value);
  } catch {
    return new URL(LOCAL_ORIGIN);
  }
}

export function absoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

// JSON-LD is inlined in a script tag, so "<" is escaped to keep content from closing it.
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// Search engines keep about 160 characters of a description.
export function toMetaDescription(text: string, maxLength = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}
