// Only same-site absolute paths are accepted as post-login destinations (no open redirects).
export function safeNextPath(value: unknown, fallback: string) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.length > 300
  ) {
    return fallback;
  }
  return value;
}

export function signInPath(nextPath: string) {
  return `/sign-in?next=${encodeURIComponent(nextPath)}`;
}

export function defaultHomePath(role: "student" | "teacher") {
  return role === "teacher" ? "/teach" : "/classes";
}
