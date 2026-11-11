import "server-only";

import { notFound } from "next/navigation";

import { ServiceError } from "@/lib/server/supabase";

// Missing and foreign records render the same 404, so pages never reveal what exists.
export async function loadOrNotFound<T>(load: Promise<T>) {
  try {
    return await load;
  } catch (error) {
    if (error instanceof ServiceError && error.code === "not_found") {
      notFound();
    }
    throw error;
  }
}

// Starts a read the page may not end up using, so it runs alongside the others. A failure
// surfaces only where the page awaits it; an unused one is dropped, not an unhandled rejection.
export function startRead<T>(load: Promise<T>) {
  load.catch(() => undefined);
  return load;
}
