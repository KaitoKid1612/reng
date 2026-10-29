import "server-only";

import { timingSafeEqual } from "node:crypto";

// Vercel cron sends `Authorization: Bearer <CRON_SECRET>`; compare in constant time.
export function isCronAuthorized(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
