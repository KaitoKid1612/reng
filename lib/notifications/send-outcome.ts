// "retry": definitely or possibly not delivered; the same idempotency key is reused.
// "duplicate": the provider already sent an email under this key, so this one is done.
export type SendOutcome =
  | { status: "sent"; providerMessageId: string }
  | { status: "duplicate" }
  | { status: "retry"; error: string }
  | { status: "rejected"; error: string };

// errorName is the provider's error code from the response body, when it has one.
export function classifySendFailure(status: number, errorName: string | null): SendOutcome {
  if (status === 409) {
    // Resend checks a key against emails already sent in the last 24 hours. A retry is composed
    // again, so its content can differ from the attempt that went through; Resend then refuses
    // it, and the email from that attempt is the one the person got.
    if (errorName === "invalid_idempotent_request") {
      return { status: "duplicate" };
    }
    // The first request with this key is still being processed; Resend says retrying is safe.
    if (errorName === "concurrent_idempotent_requests") {
      return { status: "retry", error: "http_409_concurrent" };
    }
  }
  // 429 and 5xx may succeed later; other 4xx responses mean the request itself is wrong.
  return status === 429 || status >= 500
    ? { status: "retry", error: `http_${status}` }
    : { status: "rejected", error: `http_${status}` };
}
