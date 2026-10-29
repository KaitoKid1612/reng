import { expect, test } from "@playwright/test";

import { adminClient, createConfirmedStudent, RUN_ID, signIn } from "./support";

import type { Browser } from "@playwright/test";

const PASSWORD = `admin-pass-${RUN_ID}`;

async function newAccount(browser: Browser, suffix: string, fullName: string) {
  const email = `platform-${suffix}-${RUN_ID}@example.test`;
  await createConfirmedStudent(email, PASSWORD, fullName);
  const page = await (await browser.newContext()).newPage();
  await signIn(page, email, PASSWORD);
  const { data } = await adminClient().auth.admin.listUsers({ perPage: 1000 });
  const id = data.users.find((user) => user.email === email)?.id ?? "";
  return { page, email, id };
}

async function setApprovalRequired(isRequired: boolean) {
  const { error } = await adminClient()
    .from("platform_settings")
    .update({ teacher_approval_required: isRequired })
    .eq("id", true);
  expect(error).toBeNull();
}

test("an admin approves, tracks and suspends rented teachers; others cannot open the console", async ({
  browser,
}) => {
  await setApprovalRequired(true);
  const admin = await newAccount(browser, "admin", `Quản trị ${RUN_ID}`);
  const { error } = await adminClient().from("platform_admins").insert({ user_id: admin.id });
  expect(error).toBeNull();
  const applicantName = `Cô Mai ${RUN_ID}`;
  const applicant = await newAccount(browser, "applicant", applicantName);
  try {
    await applicant.page.goto("/admin");
    await expect(
      applicant.page.getByRole("heading", { name: "Quản trị", exact: true }),
    ).toHaveCount(0);

    await applicant.page.goto("/teach/start");
    await applicant.page.getByLabel(/Tôi chịu trách nhiệm/).check();
    await applicant.page
      .getByRole("button", { name: "Gửi yêu cầu giảng dạy", exact: true })
      .click();
    await expect(applicant.page.getByText(/Đã gửi yêu cầu/)).toBeVisible();
    await applicant.page.reload();
    await expect(applicant.page.getByText(/đang chờ quản trị viên duyệt/)).toBeVisible();
    await applicant.page.goto("/teach");
    await expect(
      applicant.page.getByRole("heading", { name: "Giảng dạy", exact: true }),
    ).toHaveCount(0);

    await admin.page.goto("/admin");
    await expect(admin.page.getByRole("heading", { name: "Quản trị", exact: true })).toBeVisible();
    await expect(admin.page.getByText(/yêu cầu giảng dạy đang chờ/)).toBeVisible();
    await expect(admin.page.getByRole("link", { name: "Quản trị", exact: true })).toBeVisible();
    await admin.page.getByRole("link", { name: "Giáo viên", exact: true }).click();
    const row = admin.page.getByRole("listitem").filter({ hasText: applicant.email });
    await expect(row.getByText("Chờ duyệt", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: `Duyệt ${applicantName}`, exact: true }).click();
    await expect(row.getByText("Đang dạy", { exact: true })).toBeVisible();
    await row.getByLabel(`Hạn thuê của ${applicantName}`).fill("2026-01-31");
    await row.getByLabel(`Ghi chú của ${applicantName}`).fill("Đã chuyển khoản tháng 1");
    await row.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(row.getByText("Quá hạn thuê", { exact: true })).toBeVisible();

    await applicant.page.goto("/teach");
    await expect(
      applicant.page.getByRole("heading", { name: "Giảng dạy", exact: true }),
    ).toBeVisible();

    await row.getByRole("button", { name: `Tạm dừng ${applicantName}`, exact: true }).click();
    await expect(
      row.getByRole("button", { name: `Mở lại ${applicantName}`, exact: true }),
    ).toBeVisible();
    await applicant.page.goto("/teach/start");
    await expect(applicant.page.getByText(/Quyền giảng dạy đang tạm dừng/)).toBeVisible();

    await admin.page.goto("/admin/activity");
    await expect(admin.page.getByText("Quản trị viên tạm dừng giáo viên").first()).toBeVisible();
    await expect(admin.page.getByText("Cập nhật hạn thuê/ghi chú").first()).toBeVisible();

    await admin.page.goto("/admin");
    await admin.page.getByLabel("Duyệt giáo viên mới trước khi cho dạy").uncheck();
    await admin.page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
    await expect(admin.page.getByText(/tự kích hoạt sau khi xác minh email/)).toBeVisible();
    const selfServe = await newAccount(browser, "self", `Thầy Nam ${RUN_ID}`);
    await selfServe.page.goto("/teach/start");
    await selfServe.page.getByLabel(/Tôi chịu trách nhiệm/).check();
    await selfServe.page.getByRole("button", { name: "Kích hoạt giảng dạy", exact: true }).click();
    await selfServe.page.waitForURL("**/teach");
    await selfServe.page.context().close();

    const narrow = await (
      await browser.newContext({ viewport: { width: 360, height: 780 } })
    ).newPage();
    await signIn(narrow, admin.email, PASSWORD);
    for (const path of ["/admin", "/admin/teachers", "/admin/activity"]) {
      await narrow.goto(path);
      const fits = await narrow.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );
      expect(fits, path).toBe(true);
    }
    await narrow.context().close();
  } finally {
    await setApprovalRequired(true);
    await Promise.all([admin.page.context().close(), applicant.page.context().close()]);
  }
});
