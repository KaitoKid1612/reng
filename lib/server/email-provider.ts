import "server-only";

import { classifySendFailure } from "@/lib/notifications/send-outcome";

import type { SendOutcome } from "@/lib/notifications/send-outcome";

export type { SendOutcome } from "@/lib/notifications/send-outcome";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  oneClickUnsubscribeUrl: string;
}

export interface EmailProvider {
  name: "resend" | "mailpit";
  send: (email: OutgoingEmail) => Promise<SendOutcome>;
}

const REQUEST_TIMEOUT_MS = 10_000;

function parseSender(value: string) {
  const match = /^\s*(.*?)\s*<([^<>]+)>\s*$/.exec(value);
  return match ? { name: match[1], email: match[2] } : { name: "", email: value.trim() };
}

function unsubscribeHeaders(url: string) {
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

async function readMessageId(response: Response, field: "id" | "ID") {
  const data: unknown = await response.json().catch(() => null);
  if (data && typeof data === "object" && field in data) {
    const value: unknown = Reflect.get(data, field);
    return typeof value === "string" ? value : null;
  }
  return null;
}

async function readErrorName(response: Response) {
  const data: unknown = await response.json().catch(() => null);
  const name: unknown = data && typeof data === "object" ? Reflect.get(data, "name") : null;
  return typeof name === "string" ? name : null;
}

async function classifyFailure(response: Response): Promise<SendOutcome> {
  const errorName = response.status === 409 ? await readErrorName(response) : null;
  return classifySendFailure(response.status, errorName);
}

function createResendProvider(apiKey: string, from: string): EmailProvider {
  return {
    name: "resend",
    async send(email) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": email.idempotencyKey,
          },
          body: JSON.stringify({
            from,
            to: [email.to],
            subject: email.subject,
            html: email.html,
            text: email.text,
            headers: unsubscribeHeaders(email.oneClickUnsubscribeUrl),
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
          return classifyFailure(response);
        }
        const id = await readMessageId(response, "id");
        return id
          ? { status: "sent", providerMessageId: id }
          : { status: "retry", error: "missing_id" };
      } catch {
        return { status: "retry", error: "network_or_timeout" };
      }
    },
  };
}

// Local development only: Mailpit's HTTP send API, never a remote server.
function createMailpitProvider(baseUrl: string, from: string): EmailProvider | null {
  if (!["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname)) {
    return null;
  }
  const sender = parseSender(from);
  return {
    name: "mailpit",
    async send(email) {
      try {
        const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            From: { Email: sender.email, Name: sender.name },
            To: [{ Email: email.to }],
            Subject: email.subject,
            HTML: email.html,
            Text: email.text,
            Headers: {
              ...unsubscribeHeaders(email.oneClickUnsubscribeUrl),
              "X-Idempotency-Key": email.idempotencyKey,
            },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
          return classifyFailure(response);
        }
        const id = await readMessageId(response, "ID");
        return id
          ? { status: "sent", providerMessageId: id }
          : { status: "retry", error: "missing_id" };
      } catch {
        return { status: "retry", error: "network_or_timeout" };
      }
    },
  };
}

export function getEmailProvider(): EmailProvider | null {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return null;
  }
  if (process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY) {
    return createResendProvider(process.env.RESEND_API_KEY, from);
  }
  if (process.env.EMAIL_PROVIDER === "mailpit" && process.env.MAILPIT_URL) {
    return createMailpitProvider(process.env.MAILPIT_URL, from);
  }
  return null;
}
