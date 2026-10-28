import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { z } from "zod";

export function isClassroomConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SECRET_KEY,
  );
}

// Bypasses RLS: callers must authenticate the user and check ownership/membership first.
export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new ServiceError("not_configured");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export class ServiceError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ServiceError";
  }
}

function toServiceError(error: { message: string; code?: string }) {
  if (error.code === "23505") {
    return new ServiceError("duplicate");
  }
  // RPC business violations are raised as "masu:<code>"; anything else stays generic.
  return new ServiceError(/masu:([a-z_]+)/.exec(error.message)?.[1] ?? "database_error");
}

export async function callRpc<Schema extends z.ZodType>(
  name: string,
  args: Record<string, unknown>,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const { data, error } = await createServiceClient().rpc(name, args);
  if (error) {
    throw toServiceError(error);
  }
  return schema.parse(data);
}

export async function selectRows<Schema extends z.ZodType>(
  query: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>,
  schema: Schema,
): Promise<z.infer<Schema>[]> {
  const { data, error } = await query;
  if (error) {
    throw toServiceError(error);
  }
  return (Array.isArray(data) ? data : []).map((row) => schema.parse(row));
}

export async function selectOptional<Schema extends z.ZodType>(
  query: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>,
  schema: Schema,
): Promise<z.infer<Schema> | null> {
  const { data, error } = await query;
  if (error) {
    throw toServiceError(error);
  }
  return data === null ? null : schema.parse(data);
}

export async function runMutation(
  query: PromiseLike<{ error: { message: string; code?: string } | null }>,
) {
  const { error } = await query;
  if (error) {
    throw toServiceError(error);
  }
}
