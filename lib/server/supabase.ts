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

// Google sign-in also needs the Google provider enabled in Supabase Auth (docs/poc-setup.md), so
// the button stays hidden until the deployment opts in.
export function isGoogleAuthEnabled() {
  return isClassroomConfigured() && process.env.AUTH_GOOGLE_ENABLED === "true";
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
  // RPC business violations are raised as "reng:<code>"; anything else stays generic.
  return new ServiceError(/reng:([a-z_]+)/.exec(error.message)?.[1] ?? "database_error");
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

// Matches [api] max_rows in supabase/config.toml: a longer result comes back cut to this.
const PAGE_ROWS = 1000;

// Reads a growing table a page at a time; the query must be ordered so pages do not overlap.
export async function selectEveryPage<Schema extends z.ZodType>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>,
  schema: Schema,
): Promise<z.infer<Schema>[]> {
  const rows: z.infer<Schema>[] = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    const page = await selectRows(query(from, from + PAGE_ROWS - 1), schema);
    rows.push(...page);
    if (page.length < PAGE_ROWS) {
      return rows;
    }
  }
}

// An `in` filter travels in the request URL; a long ID list (every teacher of the platform, every
// submission of a big class) would exceed the gateway's URL limit, so it is read in chunks.
const IN_FILTER_CHUNK = 100;

export async function selectRowsIn<Schema extends z.ZodType>(
  values: readonly string[],
  query: (
    chunk: string[],
  ) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>,
  schema: Schema,
): Promise<z.infer<Schema>[]> {
  const unique = [...new Set(values)];
  const chunks: string[][] = [];
  for (let start = 0; start < unique.length; start += IN_FILTER_CHUNK) {
    chunks.push(unique.slice(start, start + IN_FILTER_CHUNK));
  }
  const pages = await Promise.all(chunks.map((chunk) => selectRows(query(chunk), schema)));
  return pages.flat();
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
