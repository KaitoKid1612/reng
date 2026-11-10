import { expect, test } from "@playwright/test";

import { adminClient, createConfirmedStudent, RUN_ID, signIn, TEACHER } from "./support";

test("a learner deletes their account: signed out for good, the class keeps a nameless trace", async ({
  page,
  browser,
}) => {
  const learner = {
    email: `delete-${RUN_ID}-${Date.now()}@example.test`,
    password: "learner-password-1",
    name: `Học viên xóa ${RUN_ID}`,
  };
  await signIn(page, TEACHER.email, TEACHER.password, "/teach/classes");
  await page.getByLabel("Tên lớp", { exact: true }).fill(`Lớp xóa tài khoản ${RUN_ID}`);
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  const classUrl = page.url();
  const code = ((await page.locator(".join-code").textContent()) ?? "").replace("-", "");
  // A teaching account cannot delete itself; the page says why instead of offering the form.
  await page.goto("/settings/account");
  await expect(page.getByText("Tài khoản dạy học có lớp và bài học phụ thuộc")).toBeVisible();
  await expect(page.getByRole("button", { name: "Xóa tài khoản vĩnh viễn" })).toHaveCount(0);

  await createConfirmedStudent(learner.email, learner.password, learner.name);
  const context = await browser.newContext();
  const learnerPage = await context.newPage();
  await signIn(learnerPage, learner.email, learner.password);
  await learnerPage.goto("/join-class");
  await learnerPage.getByLabel("Mã lớp", { exact: true }).fill(code);
  await learnerPage.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await learnerPage.waitForURL(/\/classes\/[0-9a-f-]{36}$/);
  await page.goto(classUrl);
  await expect(page.getByText(learner.name)).toBeVisible();

  await learnerPage.goto("/settings/account");
  const form = learnerPage.locator("form", {
    has: learnerPage.getByRole("heading", { name: "Xóa tài khoản" }),
  });
  await form.getByLabel("Gõ XÓA để xác nhận").fill("xoa nhe");
  await form.getByRole("button", { name: "Xóa tài khoản vĩnh viễn" }).click();
  await expect(form.getByText("Gõ XÓA vào ô xác nhận để xóa tài khoản.")).toBeVisible();
  await form.getByLabel("Gõ XÓA để xác nhận").fill("xóa");
  await form.getByRole("button", { name: "Xóa tài khoản vĩnh viễn" }).click();
  await learnerPage.waitForURL("**/account-deleted");
  await expect(learnerPage.getByRole("heading", { name: "Đã xóa tài khoản" })).toBeVisible();
  // Signed out here, and the old password no longer opens anything.
  await learnerPage.goto("/classes");
  await expect(learnerPage).toHaveURL(/\/sign-in/);
  await learnerPage.getByLabel("Email", { exact: true }).fill(learner.email);
  await learnerPage.getByLabel("Mật khẩu", { exact: true }).fill(learner.password);
  await learnerPage.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(learnerPage.getByRole("alert")).toBeVisible();
  await expect(learnerPage).toHaveURL(/\/sign-in/);
  await context.close();

  // The class roster lists the learner no more; the profile keeps only the placeholder name.
  await page.goto(classUrl);
  await expect(page.getByText(learner.name)).toHaveCount(0);
  const admin = adminClient();
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  expect(users.users.some((user) => user.email === learner.email)).toBe(false);
  const { data: profiles } = await admin
    .from("profiles")
    .select("full_name, deleted_at")
    .eq("full_name", "Học viên đã xóa")
    .not("deleted_at", "is", null);
  expect(profiles?.length ?? 0).toBeGreaterThan(0);
});
