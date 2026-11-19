import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { adminClient, findUserId, RUN_ID, signIn, TEACHER } from "./support";

const BANK_ID = `n5-mock-${RUN_ID}`;
const BANK_TITLE = `Đề Reng N5 ${RUN_ID}`;

// The repo's N5 mock bank (written in the test's parts, with bundled MP3s) becomes a lesson of the
// E2E teacher, published through the same database function as the editor.
async function publishBank() {
  const teacherId = await findUserId(TEACHER.email);
  if (!teacherId) {
    throw new Error("The E2E teacher is missing.");
  }
  const bank = JSON.parse(await readFile("content/review-banks/n5-jlpt-mock.json", "utf8"));
  const published = await adminClient().rpc("publish_lesson", {
    p_lesson_id: BANK_ID,
    p_owner_id: teacherId,
    p_expected_revision: 0,
    p_title: BANK_TITLE,
    p_title_ja: "N5",
    p_summary: "Đề Reng N5",
    p_order_no: 951,
    p_course_id: "n5",
    p_content: bank.content,
  });
  if (published.error) {
    throw published.error;
  }
}

test("a self-study learner opens Reng's N5 exams from the library and starts one", async ({
  page,
}) => {
  await publishBank();
  await signIn(page, TEACHER.email, TEACHER.password, "/teach/classes");
  const className = `Tự ôn N5 ${RUN_ID}`;
  await page.getByLabel("Tên lớp", { exact: true }).fill(className);
  await page.getByLabel(/Lớp tự học của tôi/).check();
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  const classId = page.url().split("/").at(-1) ?? "";

  await page.goto(`/teach/classes/${classId}/assign`);
  await page.locator("#class-lesson").selectOption(BANK_ID);
  await page.getByRole("button", { name: "Lưu vào lớp", exact: true }).click();
  await expect(page.getByText("Đã cập nhật nội dung lớp.")).toBeVisible();
  // The exam form previews the real N5 test for a bank written in its parts.
  await page.getByRole("link", { name: "Tạo đề thi thử JLPT" }).click();
  const form = page.locator("section", {
    has: page.getByRole("heading", { name: "Thi thử JLPT", exact: true }),
  });
  await expect(form.getByRole("status")).toContainText(
    "Đề gồm 21 câu chữ Hán – từ vựng, 22 câu ngữ pháp – đọc hiểu, 24 câu nghe hiểu: 67 câu",
  );

  await page.getByRole("link", { name: "Luyện đề", exact: true }).click();
  // The first visit compiles the page on the dev server.
  await page.waitForURL(/\/exams$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Luyện đề JLPT");
  const section = page.locator("section", { has: page.getByRole("heading", { name: className }) });
  await expect(section).toContainText("Lớp chưa mở đề nào.");
  const library = section.locator(".exam-library-row");
  await expect(library).toContainText("Đề Reng N5 số 1");
  await expect(library).toContainText("còn đủ 3 đề không trùng câu");
  // A double click opens one exam, not two: the library below still counts 2 left.
  await library.getByRole("button", { name: "Mở đề này" }).dblclick();
  await page.waitForURL(/\/exams\?(opened|error)=/, { timeout: 60_000 });
  expect(new URL(page.url()).searchParams.get("error")).toBeNull();
  // The notice sits in the class the page lands on, not at the top of a long page.
  await expect(section.getByText("Đã mở đề mới.")).toBeInViewport();

  const row = section.getByRole("row", { name: /Đề Reng N5 số 1/ });
  await expect(row).toContainText("Đề Reng N5");
  await expect(row).toContainText("90 phút");
  await expect(library).toContainText("Đề Reng N5 số 2");
  await expect(library).toContainText("còn đủ 2 đề không trùng câu");
  await expect(section.locator("tbody tr")).toHaveCount(1);

  await row.getByRole("link", { name: "Làm đề" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đề Reng N5 số 1");
  await expect(page.getByText(/67 câu/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Bắt đầu thi" })).toBeVisible();
});
