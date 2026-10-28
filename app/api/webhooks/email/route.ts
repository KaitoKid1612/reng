import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyWebhookSignature } from "@/lib/notifications/webhook-signature";
import { handleEmailEvent } from "@/lib/server/notifications";

const eventSchema = z.object({
  type: z.string().max(64),
  data: z.object({ email_id: z.string().max(200) }),
});

// Provider events are signed; repeated deliveries are harmless because updates are idempotent.
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ code: "not_configured" }, { status: 503 });
  }
  const body = await request.text();
  const isValid = verifyWebhookSignature(
    body,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    secret,
    new Date(),
  );
  if (!isValid) {
    return NextResponse.json({ code: "invalid_signature" }, { status: 401 });
  }
  const event = eventSchema.safeParse(JSON.parse(body));
  if (!event.success) {
    return NextResponse.json({ code: "ignored" });
  }
  await handleEmailEvent(event.data.type, event.data.data.email_id, new Date());
  return NextResponse.json({ code: "ok" });
}
