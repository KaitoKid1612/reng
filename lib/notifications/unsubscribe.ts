import { createHmac, timingSafeEqual } from "node:crypto";

const SCOPE = "unsubscribe:v1";

function sign(userId: string, secret: string) {
  return createHmac("sha256", secret).update(`${SCOPE}:${userId}`).digest("base64url");
}

// Scoped signature instead of a bare user ID; rotating the secret retires every old link.
export function createUnsubscribeToken(userId: string, secret: string) {
  return `${Buffer.from(userId).toString("base64url")}.${sign(userId, secret)}`;
}

export function verifyUnsubscribeToken(token: string, secret: string) {
  const [encodedUser, signature, extra] = token.split(".");
  if (!encodedUser || !signature || extra !== undefined) {
    return null;
  }
  const userId = Buffer.from(encodedUser, "base64url").toString("utf8");
  if (!/^[0-9a-f-]{36}$/.test(userId)) {
    return null;
  }
  const expected = Buffer.from(sign(userId, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received) ? userId : null;
}
