import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import {
  adminClient,
  createConfirmedStudent,
  findUserId,
  RUN_ID,
  signIn,
  TEACHER,
} from "./support";

const BANK_ID = `n5-mock-${RUN_ID}`;
const BANK_TITLE = `Đề Reng N5 ${RUN_ID}`;

// The repo's N5 mock bank (written in the test's parts, with bundled MP3s) becomes a lesson of the
// E2E teacher, published through the same database function as the editor.
async function publishBank(lessonId = BANK_ID) {
  const teacherId = await findUserId(TEACHER.email);
  if (!teacherId) {
    throw new Error("The E2E teacher is missing.");
  }
  const bank = JSON.parse(await readFile("content/review-banks/n5-jlpt-mock.json", "utf8"));
  const published = await adminClient().rpc("publish_lesson", {
    p_lesson_id: lessonId,
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
  // The bank offers Reng's fixed exam and the exams composed from it, each on its own row.
  const fixed = section.locator(".exam-library-row", { hasText: "Đề thi thử Reng N5 số 1" });
  await expect(fixed).toBeVisible();
  const library = section.locator(".exam-library-row", { hasText: /Đề Reng N5 số \d/ });
  await expect(library).toContainText("Đề Reng N5 số 1");
  // Every row prints, the bank's next exam too: the copy printed before opening is that exam.
  await library.getByRole("link", { name: "Bản in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đề Reng N5 số 1");
  const questions = page.locator(".exam-print .exam-print-question");
  await expect(questions).toHaveCount(67);
  const printedBeforeOpening = await questions.allInnerTexts();
  await page.goto("/exams");
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
  await expect(section.locator("tbody tr")).toHaveCount(1);
  await row.getByRole("link", { name: "Bản in" }).click();
  await expect(questions).toHaveCount(67);
  expect(await questions.allInnerTexts()).toEqual(printedBeforeOpening);
  await page.goto("/exams");

  await row.getByRole("link", { name: "Làm đề" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đề Reng N5 số 1");
  await expect(page.getByText(/67 câu/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Bắt đầu thi" })).toBeVisible();
});

test("a class owner opens the fixed Reng exam once and prints its booklets; a learner cannot", async ({
  page,
  browser,
}) => {
  const bankId = `${BANK_ID}-fixed`;
  await publishBank(bankId);
  await signIn(page, TEACHER.email, TEACHER.password, "/teach/classes");
  const className = `Đề cố định N5 ${RUN_ID}`;
  await page.getByLabel("Tên lớp", { exact: true }).fill(className);
  await page.getByLabel(/Lớp tự học của tôi/).check();
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  const classId = page.url().split("/").at(-1) ?? "";
  await page.goto(`/teach/classes/${classId}/assign`);
  await page.locator("#class-lesson").selectOption(bankId);
  await page.getByRole("button", { name: "Lưu vào lớp", exact: true }).click();
  await expect(page.getByText("Đã cập nhật nội dung lớp.")).toBeVisible();

  await page.goto("/exams", { timeout: 60_000 });
  const section = page.locator("section", { has: page.getByRole("heading", { name: className }) });
  const fixed = section.locator(".exam-library-row", { hasText: "Đề thi thử Reng N5 số 1" });
  await fixed.getByRole("button", { name: "Mở đề này" }).click();
  await page.waitForURL(/\/exams\?(opened|error)=/, { timeout: 60_000 });
  expect(new URL(page.url()).searchParams.get("error")).toBeNull();
  await expect(section.getByRole("row", { name: /Đề thi thử Reng N5 số 1/ })).toContainText(
    "90 phút",
  );
  // Opened once: no second button; its 67 questions count as asked, so the bank keeps 2 exams
  // and still numbers its own exams from 1.
  await expect(fixed.getByRole("button", { name: "Mở đề này" })).toHaveCount(0);
  const bank = section.locator(".exam-library-row", { hasText: /Đề Reng N5 số \d/ });
  await expect(bank).toContainText("Đề Reng N5 số 1");

  await fixed.getByRole("link", { name: "Bản in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đề thi thử Reng N5 số 1");
  const sheet = page.locator(".exam-print");
  await expect(sheet).toContainText("Đề thi thử do Reng biên soạn, không phải đề thi thật.");
  await expect(sheet.locator(".exam-print-question")).toHaveCount(67);
  await expect(sheet.locator(".exam-print-qr")).toHaveCount(24);
  // The learner's booklet holds no answer; only the toolbar names the teacher's booklets.
  const learnerText = (await sheet.locator(".exam-print-section").allInnerTexts()).join("\n");
  expect(learnerText).not.toContain("Đáp án");
  await expect(sheet.locator(".exam-print-key-answer")).toHaveCount(0);
  await page.getByRole("link", { name: "Đáp án và giải thích" }).click();
  await expect(page.locator(".exam-print-key-row")).toHaveCount(67);
  await expect(page.getByRole("button", { name: "In / Lưu PDF" })).toBeVisible();

  // The print list on the exam page offers every booklet of the official tests too.
  await page.goto("/exams");
  const prints = page.locator("section", {
    has: page.getByRole("heading", { name: "Bản in đề JLPT" }),
  });
  await expect(prints.locator(".exam-library-row")).toHaveCount(11);

  const email = `print-learner-${RUN_ID}-${Date.now()}@reng.local`;
  await createConfirmedStudent(email, "learner-password-1", "Học viên in");
  const learner = await browser.newPage();
  await signIn(learner, email, "learner-password-1", "/exams/print/reng-n5-1?booklet=answers");
  await expect(learner.locator(".notice-panel")).toContainText("Chỉ giáo viên và chủ lớp");
  await expect(learner.locator(".exam-print")).toHaveCount(0);
  await learner.goto("/exams");
  await expect(learner.getByRole("heading", { name: "Bản in đề JLPT" })).toHaveCount(0);
  await learner.close();
});
