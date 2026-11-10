import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { z } from "zod";

import { signInPath } from "@/lib/auth-paths";
import { removeSignIn } from "@/lib/server/account-deletion";
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
  // Missing until migration 20261110111047 is applied; the page works either way.
  deleted_at: z.string().nullable().optional(),
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
    createServiceClient().from("profiles").select("*").eq("id", user.id).maybeSingle(),
    profileSchema,
  );
  if (!profile) {
    return null;
  }
  if (profile.deleted_at) {
    // A deleted account whose sign-in survived a failed step: finish it, then act signed out.
    await removeSignIn(user.id).catch((error: unknown) => {
      console.error("Finishing an account deletion failed", user.id, error);
    });
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
    // A learner or a paused teacher lands on the start page, which explains how to begin teaching
    // or why teaching is paused. The role check runs before any lookup, so no ID is revealed.
    redirect("/teach/start");
  }
  return account;
}

export async function requireStudent(nextPath: string) {
  const account = await requireAccount(nextPath);
  return account;
}
