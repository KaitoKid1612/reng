import "server-only";

// Next.js dev reports request.url as localhost even when the browser used 127.0.0.1. Cookies
// are bound to the host the browser requested, so redirects and same-origin checks use the
// forwarded host instead.
export function getRequestOrigin(headers: Headers, fallbackUrl?: string) {
  const fallback = fallbackUrl ? new URL(fallbackUrl) : null;
  const host =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? headers.get("host") ?? fallback?.host;
  const protocol =
    headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    fallback?.protocol.replace(":", "") ??
    "http";
  return `${protocol}://${host}`;
}
