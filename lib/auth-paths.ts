const PLACEHOLDER_ORIGIN = "https://reng.invalid";

function hasControlOrBackslash(value: string) {
  return [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 0x20 || code === 0x7f || character === "\\";
  });
}

// Only same-site absolute paths are accepted as post-login destinations (no open redirects).
// Browsers drop tabs/newlines and read backslashes as slashes before resolving a URL, so
// "/\t/evil.example" would leave the site: such values are rejected, and the rest must
// resolve to the same origin as a plain path.
export function safeNextPath(value: unknown, fallback: string) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.length > 300 ||
    hasControlOrBackslash(value)
  ) {
    return fallback;
  }
  try {
    return new URL(value, PLACEHOLDER_ORIGIN).origin === PLACEHOLDER_ORIGIN ? value : fallback;
  } catch {
    return fallback;
  }
}

export function signInPath(nextPath: string) {
  return `/sign-in?next=${encodeURIComponent(nextPath)}`;
}

// Reasons the sign-in page explains: an expired email link, or a Google sign-in that failed or
// that the person cancelled.
export type SignInError = "link" | "google" | "google-cancelled";

export function signInErrorPath(error: SignInError, nextPath: string) {
  const query = new URLSearchParams({ error });
  if (nextPath) {
    query.set("next", nextPath);
  }
  return `/sign-in?${query.toString()}`;
}

// Where Google sign-in returns, carrying the page to open afterwards.
export function googleCallbackPath(nextPath: string) {
  return nextPath ? `/auth/callback?next=${encodeURIComponent(nextPath)}` : "/auth/callback";
}

export function defaultHomePath(role: "student" | "teacher") {
  return role === "teacher" ? "/teach" : "/classes";
}
