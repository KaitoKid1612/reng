"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { defaultHomePath, safeNextPath } from "@/lib/auth-paths";
import { getRequestOrigin } from "@/lib/server/request-origin";
import { createServiceClient, selectOptional } from "@/lib/server/supabase";
import { createSessionClient } from "@/lib/supabase-session";

export interface AuthFormState {
  error?: string;
  notice?: string;
  sentTo?: string;
  unconfirmedEmail?: string;
}

const UNAVAILABLE = "Tài khoản chưa được kích hoạt trên hệ thống này.";
const RATE_LIMITED = "Bạn thao tác hơi nhanh. Đợi vài phút rồi thử lại nhé.";

const email = z.email("Email chưa đúng định dạng.").max(254);
const password = z
  .string()
  .min(8, "Mật khẩu cần ít nhất 8 ký tự.")
  .max(72, "Mật khẩu tối đa 72 ký tự.");

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Thông tin chưa hợp lệ.";
}

// Email links come back to this deployment; Supabase also checks them against its allowlist.
async function getSiteOrigin() {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, "");
  }
  return getRequestOrigin(await headers());
}

async function confirmationLink(nextPath: string) {
  return `${await getSiteOrigin()}/auth/confirm?next=${encodeURIComponent(nextPath)}`;
}

function isRateLimited(error: { status?: number; code?: string }) {
  return error.status === 429 || error.code === "over_email_send_rate_limit";
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Nhập họ tên của bạn.").max(80, "Họ tên tối đa 80 ký tự."),
  email,
  password,
});

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const client = await createSessionClient();
  if (!client) {
    return { error: UNAVAILABLE };
  }
  const parsed = signUpSchema.safeParse({
    fullName: readField(formData, "fullName"),
    email: readField(formData, "email").trim(),
    password: readField(formData, "password"),
  });
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }
  const nextPath = safeNextPath(readField(formData, "next"), "/classes");
  const { error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: await confirmationLink(nextPath),
    },
  });
  if (error && isRateLimited(error)) {
    return { error: RATE_LIMITED };
  }
  if (error && error.code === "weak_password") {
    return { error: "Mật khẩu quá dễ đoán. Chọn mật khẩu dài hơn hoặc khó đoán hơn." };
  }
  if (error) {
    return { error: "Chưa tạo được tài khoản. Bạn thử lại sau ít phút nhé." };
  }
  // Same response whether or not the address already has an account.
  return { sentTo: parsed.data.email };
}

const signInSchema = z.object({ email, password: z.string().min(1, "Nhập mật khẩu.").max(72) });

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const client = await createSessionClient();
  if (!client) {
    return { error: UNAVAILABLE };
  }
  const parsed = signInSchema.safeParse({
    email: readField(formData, "email").trim(),
    password: readField(formData, "password"),
  });
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }
  const { data, error } = await client.auth.signInWithPassword(parsed.data);
  if (error?.code === "email_not_confirmed") {
    return {
      error: "Email này chưa được xác nhận. Mở thư xác nhận hoặc gửi lại thư mới.",
      unconfirmedEmail: parsed.data.email,
    };
  }
  if (error && isRateLimited(error)) {
    return { error: RATE_LIMITED };
  }
  if (error || !data.user) {
    return { error: "Email hoặc mật khẩu chưa đúng." };
  }
  const profile = await selectOptional(
    createServiceClient().from("profiles").select("role").eq("id", data.user.id).maybeSingle(),
    z.object({ role: z.enum(["student", "teacher"]) }),
  );
  redirect(safeNextPath(readField(formData, "next"), defaultHomePath(profile?.role ?? "student")));
}

export async function resendConfirmation(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const client = await createSessionClient();
  if (!client) {
    return { error: UNAVAILABLE };
  }
  const parsed = email.safeParse(readField(formData, "email").trim());
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }
  const { error } = await client.auth.resend({
    type: "signup",
    email: parsed.data,
    options: {
      emailRedirectTo: await confirmationLink(
        safeNextPath(readField(formData, "next"), "/classes"),
      ),
    },
  });
  if (error && isRateLimited(error)) {
    return { error: RATE_LIMITED };
  }
  return { notice: "Nếu email này đang chờ xác nhận, thư mới sẽ đến trong vài phút." };
}

export async function requestPasswordReset(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const client = await createSessionClient();
  if (!client) {
    return { error: UNAVAILABLE };
  }
  const parsed = email.safeParse(readField(formData, "email").trim());
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }
  const { error } = await client.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: await confirmationLink("/reset-password"),
  });
  if (error && isRateLimited(error)) {
    return { error: RATE_LIMITED };
  }
  return { notice: "Nếu email này có tài khoản, thư đặt lại mật khẩu sẽ đến trong vài phút." };
}

const resetSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Hai lần nhập mật khẩu chưa khớp.",
  });

export async function resetPassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const client = await createSessionClient();
  if (!client) {
    return { error: UNAVAILABLE };
  }
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return { error: "Link đặt lại đã hết hạn. Hãy gửi yêu cầu mới." };
  }
  const parsed = resetSchema.safeParse({
    password: readField(formData, "password"),
    confirmPassword: readField(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }
  const { error } = await client.auth.updateUser({ password: parsed.data.password });
  if (error?.code === "same_password") {
    return { error: "Mật khẩu mới cần khác mật khẩu cũ." };
  }
  if (error) {
    return { error: "Chưa đổi được mật khẩu. Bạn thử lại nhé." };
  }
  await client.auth.signOut({ scope: "others" });
  const profile = await selectOptional(
    createServiceClient().from("profiles").select("role").eq("id", user.id).maybeSingle(),
    z.object({ role: z.enum(["student", "teacher"]) }),
  );
  redirect(defaultHomePath(profile?.role ?? "student"));
}

export async function signOut() {
  const client = await createSessionClient();
  await client?.auth.signOut({ scope: "local" });
  redirect("/");
}
