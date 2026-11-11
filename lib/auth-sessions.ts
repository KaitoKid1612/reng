import { z } from "zod";

// Auth versions name an email link differently: otp, email, recovery, magiclink, email/signup.
const EMAIL_LINK_METHODS = new Set(["otp", "email", "recovery", "magiclink", "email/signup"]);
// Recovery links are valid for an hour, so a new password can be set within an hour of opening one.
const EMAIL_LINK_WINDOW_MS = 60 * 60 * 1000;

const amrSchema = z.array(z.object({ method: z.string(), timestamp: z.number() }).loose());

// A new password needs a session opened from an email link within the hour: a session signed in
// with the password on a shared or borrowed device cannot replace the password.
export function isRecentEmailLinkSession(amr: unknown, now: Date) {
  const entries = amrSchema.safeParse(amr);
  return (
    entries.success &&
    entries.data.some((entry) => {
      const age = now.getTime() - entry.timestamp * 1000;
      return EMAIL_LINK_METHODS.has(entry.method) && age >= -60_000 && age <= EMAIL_LINK_WINDOW_MS;
    })
  );
}
