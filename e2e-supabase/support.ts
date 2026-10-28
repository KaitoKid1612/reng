import { createClient } from "@supabase/supabase-js";

import type { Page } from "@playwright/test";

export const TEACHER = {
  email: process.env.E2E_TEACHER_EMAIL ?? "",
  password: process.env.E2E_TEACHER_PASSWORD ?? "",
};
export const RUN_ID = process.env.E2E_RUN_ID ?? "local";

function adminClient() {
  return createClient(
    process.env.E2E_SUPABASE_URL ?? "",
    process.env.E2E_SUPABASE_SECRET_KEY ?? "",
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function createConfirmedStudent(email: string, password: string, fullName: string) {
  const { error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    throw new Error(`Unable to create ${email}: ${error.message}`);
  }
}

export async function signIn(page: Page, email: string, password: string, nextPath = "") {
  await page.goto(nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : "/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

interface MailpitMessage {
  ID: string;
  Subject: string;
}

// Reads the newest message for an address from the local Mailpit inbox.
export async function readEmailLink(email: string, subject: string) {
  const base = process.env.E2E_MAILPIT_URL ?? "";
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(
      `${base}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
    ).then((response) => response.json() as Promise<{ messages: MailpitMessage[] }>);
    const message = search.messages.find((item) => item.Subject === subject);
    if (message) {
      const detail = await fetch(`${base}/api/v1/message/${message.ID}`).then(
        (response) => response.json() as Promise<{ HTML: string }>,
      );
      const href = /href="([^"]+)"/.exec(detail.HTML)?.[1];
      if (!href) {
        throw new Error("The email has no link.");
      }
      return href.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No "${subject}" email for ${email}.`);
}
