import assert from "node:assert/strict";
import { test } from "node:test";

import { isRecentEmailLinkSession } from "../lib/auth-sessions";

test("only a session opened from an email link within the hour may set a new password", () => {
  const now = new Date("2026-11-03T10:00:00Z");
  const seconds = (offsetMinutes: number) => now.getTime() / 1000 + offsetMinutes * 60;
  assert.ok(isRecentEmailLinkSession([{ method: "otp", timestamp: seconds(-5) }], now));
  assert.ok(isRecentEmailLinkSession([{ method: "recovery", timestamp: seconds(-59) }], now));
  assert.ok(
    isRecentEmailLinkSession(
      [
        { method: "password", timestamp: seconds(-120) },
        { method: "otp", timestamp: seconds(-1) },
      ],
      now,
    ),
  );
  assert.ok(!isRecentEmailLinkSession([{ method: "password", timestamp: seconds(-1) }], now));
  assert.ok(!isRecentEmailLinkSession([{ method: "otp", timestamp: seconds(-61) }], now));
  assert.ok(!isRecentEmailLinkSession([{ method: "otp", timestamp: seconds(30) }], now));
  assert.ok(!isRecentEmailLinkSession(["otp"], now));
  assert.ok(!isRecentEmailLinkSession(undefined, now));
});
