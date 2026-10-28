import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 5 * 60;

export interface WebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

// Resend signs webhooks with Svix: HMAC-SHA256 over "id.timestamp.body" using the
// base64 secret after the "whsec_" prefix; several space-separated "v1,<sig>" may appear.
export function verifyWebhookSignature(
  body: string,
  headers: WebhookHeaders,
  secret: string,
  now: Date,
) {
  if (!headers.id || !headers.timestamp || !headers.signature || !secret.startsWith("whsec_")) {
    return false;
  }
  const timestamp = Number(headers.timestamp);
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(now.getTime() / 1000 - timestamp) > TOLERANCE_SECONDS
  ) {
    return false;
  }
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const expected = Buffer.from(
    createHmac("sha256", key).update(`${headers.id}.${headers.timestamp}.${body}`).digest("base64"),
  );
  return headers.signature.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    const candidate = Buffer.from(value ?? "");
    return (
      version === "v1" &&
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    );
  });
}
