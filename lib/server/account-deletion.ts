import "server-only";

import { z } from "zod";

import { callRpc, createServiceClient, ServiceError } from "@/lib/server/supabase";

// The auth step on its own: a soft delete keeps the auth row (its ID still matches the history)
// but removes the email, the password and every way to sign in.
export async function removeSignIn(userId: string) {
  const { error } = await createServiceClient().auth.admin.deleteUser(userId, true);
  if (error) {
    throw new ServiceError("auth_error");
  }
}

/**
 * A learner deletes their own account. The database forgets the person first (anonymize_learner:
 * name, reminders, sent-email records, leaves every class; the class history stays), then the
 * sign-in goes. If the second step fails, the app already treats the account as gone and finishes
 * it the next time that person signs in (getCurrentAccount).
 */
export async function deleteLearnerAccount(userId: string) {
  await callRpc("anonymize_learner", { p_user_id: userId }, z.unknown());
  await removeSignIn(userId);
}
