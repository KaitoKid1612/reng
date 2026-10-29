import "server-only";

import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { z } from "zod";

import { signInPath } from "@/lib/auth-paths";
import { createServiceClient, isClassroomConfigured, selectOptional } from "@/lib/server/supabase";
import { createSessionClient } from "@/lib/supabase-session";

export interface Account {
  id: string;
  email: string;
  fullName: string;
  role: "student" | "teacher";
}

const profileSchema = z.object({
  full_name: z.string(),
  role: z.enum(["student", "teacher"]),
});

// Identity comes from Supabase Auth; the role is read from profiles, never from user metadata.
export const getCurrentAccount = cache(async (): Promise<Account | null> => {
  // Identity is per request: pages that read it must never be prerendered, even when the
  // build runs without Supabase configuration.
  await connection();
  if (!isClassroomConfigured()) {
    return null;
  }
  const client = await createSessionClient();
  if (!client) {
    return null;
  }
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return null;
  }
  const profile = await selectOptional(
    createServiceClient()
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle(),
    profileSchema,
  );
  if (!profile) {
    return null;
  }
  return { id: user.id, email: user.email ?? "", fullName: profile.full_name, role: profile.role };
});

export async function requireAccount(nextPath: string) {
  const account = await getCurrentAccount();
  if (!account) {
    redirect(signInPath(nextPath));
  }
  return account;
}

export async function requireTeacher(nextPath: string) {
  const account = await requireAccount(nextPath);
  if (account.role !== "teacher") {
    notFound();
  }
  return account;
}

export async function requireStudent(nextPath: string) {
  const account = await requireAccount(nextPath);
  return account;
}
