import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCurrentAccount } from "@/lib/server/account";
import { getRequestOrigin } from "@/lib/server/request-origin";
import { isClassroomConfigured, ServiceError } from "@/lib/server/supabase";

const NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_BODY_BYTES = 64 * 1024;

const STATUS_BY_CODE: Record<string, number> = {
  not_configured: 503,
  not_found: 404,
  invalid_request: 400,
  invalid_draft: 400,
  invalid_answer: 400,
  invalid_items: 400,
  too_large: 413,
  conflict: 409,
  not_due: 409,
};

export function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export function errorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return jsonResponse({ code: error.code }, STATUS_BY_CODE[error.code] ?? 500);
  }
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return jsonResponse({ code: "invalid_request" }, 400);
  }
  // Never echo database details, answers or submission contents into the response or logs.
  console.error("Classroom API failure", error instanceof Error ? error.name : "unknown");
  return jsonResponse({ code: "server_error" }, 500);
}

export async function readJsonBody(request: Request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    throw new ServiceError("too_large");
  }
  return JSON.parse(text) as unknown;
}

// Shared guard for state-changing learner/teacher APIs.
export async function authorizeMutation(request: Request) {
  if (request.headers.get("origin") !== getRequestOrigin(request.headers, request.url)) {
    return { response: jsonResponse({ code: "invalid_origin" }, 403) };
  }
  return authorizeRead();
}

export async function authorizeRead() {
  if (!isClassroomConfigured()) {
    return { response: jsonResponse({ code: "not_configured" }, 503) };
  }
  const account = await getCurrentAccount();
  if (!account) {
    return { response: jsonResponse({ code: "unauthenticated" }, 401) };
  }
  return { account };
}
