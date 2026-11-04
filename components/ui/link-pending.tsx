"use client";

import { useLinkStatus } from "next/link";

// Inside a link: a small spinner that fades in while the next page loads, so a tap on a slow
// phone connection shows it was received instead of inviting a second tap. It is always
// rendered and absolutely placed, so the button never changes size.
export function LinkPending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className="link-pending" data-pending={pending || undefined} />;
}
