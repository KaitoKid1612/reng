import { expect, test } from "@playwright/test";

import { toVietnamInput } from "../lib/vietnam-time";

import { createConfirmedStudent, readEmailLink, RUN_ID, signIn, TEACHER } from "./support";

import type { Browser, Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const PRIVATE_EXPLANATION = `PRIVATE_TEST_EXPLANATION_${RUN_ID}`;
const TEST_PROMPT = `Viết “bạn” bằng hiragana ${RUN_ID}`;
const PRACTICE_PROMPT = "わたしは がくせい___。";
const studentA = {
  email: `student-a-${RUN_ID}@example.test`,
  password: `pass-a-${RUN_ID}`,
  name: `Nguyễn Thị Thu Hương ${RUN_ID}`,
};
const studentB = {
  email: `student-b-${RUN_ID}@example.test`,
  password: `pass-b-${RUN_ID}`,
  name: `Trần Minh Khôi ${RUN_ID}`,
};
const state = {
  classA: "",
  classB: "",
  codeA: "",
  codeB: "",
  practiceId: "",
  testId: "",
};

async function newSignedInPage(browser: Browser, email: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email, password);
  return page;
}

async function createClass(page: Page, name: string) {
  await page.goto("/teach/classes");
  await page.getByLabel("Tên lớp", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").at(-1) ?? "";
  const code = ((await page.locator(".join-code").textContent()) ?? "").replace("-", "");
  return { id, code };
}

async function publishAssignment(page: Page) {
  await page.getByRole("button", { name: "Xem lại và xuất bản", exact: true }).click();
  await page.getByRole("button", { name: "Xuất bản bài giao", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
}

async function assignmentIdByTitle(page: Page, title: string) {
  await page.goto(`/classes/${state.classA}`);
  const href = await page.getByRole("link", { name: title, exact: true }).getAttribute("href");
  return href?.split("/").at(-1) ?? "";
}

async function waitForSaved(page: Page) {
  await expect(page.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
}

test("teacher creates classes, adds a pinned lesson and publishes practice and test work", async ({
  page,
}) => {
  await signIn(page, TEACHER.email, TEACHER.password, "/teach");
  await expect(page.getByRole("heading", { name: "Giảng dạy", exact: true })).toBeVisible();
  ({ id: state.classA, code: state.codeA } = await createClass(page, `Lớp A ${RUN_ID}`));
  ({ id: state.classB, code: state.codeB } = await createClass(page, `Lớp B ${RUN_ID}`));
  expect(state.codeA).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);

  await page.goto(`/teach/classes/${state.classA}/assign`);
  await page.locator("#class-lesson").selectOption("lesson-01");
  await page.getByRole("button", { name: "Lưu vào lớp", exact: true }).click();
  await expect(page.getByText("Đã cập nhật nội dung lớp.")).toBeVisible();
  await expect(page.locator("#assignment-lesson")).toContainText("Làm quen và chào hỏi");

  await page.getByLabel("Tiêu đề", { exact: true }).fill(`Luyện です ${RUN_ID}`);
  await page.getByRole("checkbox", { name: new RegExp(PRACTICE_PROMPT) }).check();
  await publishAssignment(page);

  await page.goto(`/teach/classes/${state.classA}/assign`);
  await page.getByLabel("Tiêu đề", { exact: true }).fill(`Kiểm tra nhanh ${RUN_ID}`);
  await page.getByRole("radio", { name: "Kiểm tra", exact: true }).check();
  await page
    .getByLabel("Hạn nộp (giờ Việt Nam)")
    .fill(toVietnamInput(new Date(Date.now() + 86_400_000).toISOString()));
  await page.getByRole("button", { name: "Thêm câu điền từ", exact: true }).click();
  await page.getByLabel("Đề bài", { exact: true }).fill(TEST_PROMPT);
  await page.getByLabel(/Các đáp án được chấp nhận/).fill("きみ\nあなた");
  await page.getByLabel("Giải thích đáp án", { exact: true }).fill(PRIVATE_EXPLANATION);
  await publishAssignment(page);
  await expect(page.getByText(`Kiểm tra nhanh ${RUN_ID}`)).toBeVisible();
});

test("a new learner joins through sign-up, email confirmation and the class code", async ({
  page,
}) => {
  await page.goto("/join-class");
  await page.getByLabel("Mã lớp", { exact: true }).fill(state.codeA.toLowerCase());
  await page.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await page.waitForURL(/\/sign-in\?next=/);
  await page.getByRole("link", { name: "Tạo tài khoản học viên", exact: true }).click();
  await page.getByLabel("Họ tên", { exact: true }).fill(studentA.name);
  await page.getByLabel("Email", { exact: true }).fill(studentA.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(studentA.password);
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kiểm tra hộp thư của bạn" })).toBeVisible();

  await page.goto(await readEmailLink(studentA.email, "Xác nhận email Masu"));
  await page.waitForURL(/\/join-class\?code=/);
  await expect(page.getByLabel("Mã lớp", { exact: true })).toHaveValue(state.codeA);
  await page.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await page.waitForURL(`**/classes/${state.classA}`);
  await expect(page.getByRole("heading", { name: `Lớp A ${RUN_ID}` })).toBeVisible();
  await expect(page.getByText("1. Làm quen và chào hỏi")).toBeVisible();
  await page.screenshot({
    path: "test-results/classroom-class-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  state.practiceId = await assignmentIdByTitle(page, `Luyện です ${RUN_ID}`);
  state.testId = await assignmentIdByTitle(page, `Kiểm tra nhanh ${RUN_ID}`);
  expect(state.practiceId).toMatch(/^[0-9a-f-]{36}$/);
});

test("practice feedback, mistake book, two-tab conflict and offline saving", async ({
  page,
  context,
}) => {
  await signIn(page, studentA.email, studentA.password, `/assignments/${state.practiceId}`);
  await page.getByRole("button", { name: "Bắt đầu làm bài", exact: true }).click();
  await page.getByRole("radio", { name: "ます", exact: true }).check();
  await waitForSaved(page);
  await page.getByRole("button", { name: "Kiểm tra câu này", exact: true }).click();
  await expect(page.getByText("Chưa đúng.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "ます", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
  await page.waitForURL(`**/assignments/${state.practiceId}/results`);
  await expect(page.locator(".result-score")).toContainText("0%");
  await expect(page.getByText("Chưa đạt", { exact: true })).toBeVisible();

  await page.goto("/mistakes");
  await expect(page.getByText(PRACTICE_PROMPT)).toBeVisible();
  await page.goto("/review");
  await page.getByRole("radio", { name: "です", exact: true }).check();
  await page.getByRole("button", { name: "Trả lời", exact: true }).click();
  await expect(page.getByText("Đúng rồi!")).toBeVisible();
  await expect(page.getByText("Chuỗi đúng: 1/3.")).toBeVisible();

  await page.goto(`/assignments/${state.practiceId}`);
  await page.getByRole("button", { name: "Làm lại lượt mới", exact: true }).click();
  await expect(page.getByRole("radio", { name: "です", exact: true })).toBeEnabled();
  const secondTab = await context.newPage();
  await secondTab.goto(`/assignments/${state.practiceId}`);
  await expect(secondTab.getByRole("radio", { name: "に", exact: true })).toBeEnabled();
  await page.getByRole("radio", { name: "です", exact: true }).check();
  await waitForSaved(page);
  await secondTab.getByRole("radio", { name: "に", exact: true }).check();
  await expect(
    secondTab.getByRole("alert").filter({ hasText: "tab hoặc thiết bị khác" }),
  ).toBeVisible();
  await secondTab.getByRole("button", { name: "Tải bản mới nhất", exact: true }).click();
  await expect(secondTab.getByRole("radio", { name: "です", exact: true })).toBeChecked();
  await secondTab.close();

  await context.setOffline(true);
  await page.getByRole("radio", { name: "を", exact: true }).check();
  await expect(page.locator(".save-status")).toContainText("Mất kết nối");
  await context.setOffline(false);
  await waitForSaved(page);
  await page.getByRole("radio", { name: "です", exact: true }).check();
  await waitForSaved(page);
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await expect(page.getByRole("button", { name: "Xác nhận nộp", exact: true })).toBeFocused();
  await page.screenshot({
    path: "test-results/classroom-attempt-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await page.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
  await page.waitForURL(`**/assignments/${state.practiceId}/results`);
  await expect(page.locator(".result-score")).toContainText("100%");
  await expect(page.getByText("Đạt", { exact: true })).toBeVisible();
});

test("test answers and results stay private until the feedback time", async ({ page }) => {
  await signIn(page, studentA.email, studentA.password, `/assignments/${state.testId}`);
  await page.getByRole("button", { name: "Bắt đầu làm bài", exact: true }).click();
  const input = page.getByLabel(TEST_PROMPT);
  await input.pressSequentially("watashi");
  await expect(input).toHaveValue("わたし");
  const attemptHtml = await (await page.request.get(`/assignments/${state.testId}`)).text();
  expect(attemptHtml).not.toContain(PRIVATE_EXPLANATION);
  expect(attemptHtml).not.toContain("あなた");
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
  await page.waitForURL(`**/assignments/${state.testId}/results`);
  await expect(page.getByRole("heading", { name: "Đã nộp bài" })).toBeVisible();
  await expect(page.locator(".result-score")).toHaveCount(0);
  const resultHtml = await (await page.request.get(`/assignments/${state.testId}/results`)).text();
  expect(resultHtml).not.toContain(PRIVATE_EXPLANATION);
  expect(resultHtml).not.toContain("Đáp án:");
  await page.goto("/mistakes");
  await expect(
    page.getByText(`1 câu sai trong “Kiểm tra nhanh ${RUN_ID}” sẽ hiện sau`),
  ).toBeVisible();
  await expect(page.getByText(TEST_PROMPT)).toHaveCount(0);
});

test("learners outside the class and anonymous callers are refused", async ({
  browser,
  playwright,
}) => {
  await createConfirmedStudent(studentB.email, studentB.password, studentB.name);
  const page = await newSignedInPage(browser, studentB.email, studentB.password);
  await page.goto("/join-class");
  await page.getByLabel("Mã lớp", { exact: true }).fill(state.codeB);
  await page.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await page.waitForURL(`**/classes/${state.classB}`);
  for (const path of [
    `/assignments/${state.practiceId}`,
    `/assignments/${state.testId}/results`,
    `/classes/${state.classA}`,
    "/teach",
    `/teach/classes/${state.classA}`,
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
  const origin = new URL(page.url()).origin;
  const start = await page.request.post(`/api/assignments/${state.practiceId}/attempts`, {
    headers: { Origin: origin },
  });
  expect(start.status()).toBe(404);
  const report = await page.request.get(`/api/teach/classes/${state.classA}/report`);
  expect(report.status()).toBe(404);

  const anonymous = await playwright.request.newContext({ baseURL: origin });
  expect(
    (
      await anonymous.post(`/api/assignments/${state.practiceId}/attempts`, {
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(401);
  expect((await anonymous.get(`/api/teach/classes/${state.classA}/report`)).status()).toBe(401);
  expect(
    (
      await anonymous.post(`/api/assignments/${state.practiceId}/attempts`, {
        headers: { Origin: "https://example.invalid" },
      })
    ).status(),
  ).toBe(403);
  await anonymous.dispose();
  await page.context().close();
});

test("teacher report shows labels, frequently missed questions and a safe CSV export", async ({
  browser,
}) => {
  const page = await newSignedInPage(browser, TEACHER.email, TEACHER.password);
  await page.goto(`/teach/classes/${state.classA}`);
  const row = page.getByRole("row", { name: new RegExp(studentA.name) });
  await expect(row).toContainText("2/2");
  await expect(row).toContainText("50%");
  await expect(row).toContainText("Chưa đạt");
  await expect(page.getByText("1/1 học viên sai")).toBeVisible();
  await page.screenshot({
    path: "test-results/classroom-report-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  const csvResponse = await page.request.get(`/api/teach/classes/${state.classA}/report`);
  expect(csvResponse.headers()["content-type"]).toContain("text/csv");
  const csv = await csvResponse.text();
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain(`"${studentA.name}"`);
  expect(csv).toContain('"Chưa đạt"');

  const closing = page.getByRole("listitem").filter({ hasText: `Kiểm tra nhanh ${RUN_ID}` });
  await closing.getByRole("button", { name: "Đóng bài", exact: true }).click();
  await closing.getByRole("button", { name: "Xác nhận đóng", exact: true }).click();
  await expect(closing).toContainText("đã đóng");
  await page.context().close();
});

test("learners reset a forgotten password through the email link", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email đã đăng ký", { exact: true }).fill(studentA.email);
  await page.getByRole("button", { name: "Gửi link đặt lại", exact: true }).click();
  await expect(page.getByText("Nếu email này có tài khoản")).toBeVisible();
  await page.goto(await readEmailLink(studentA.email, "Đặt lại mật khẩu Masu"));
  await page.waitForURL("**/reset-password");
  const newPassword = `${studentA.password}-new`;
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(newPassword);
  await page.getByLabel("Nhập lại mật khẩu mới", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Đặt mật khẩu mới", exact: true }).click();
  await page.waitForURL("**/classes");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await signIn(page, studentA.email, newPassword);
  await expect(page).toHaveURL(/\/classes$/);
  studentA.password = newPassword;
});

test("learner and teacher classroom pages fit a 360px screen", async ({ browser }) => {
  const student = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const studentPage = await student.newPage();
  const consoleErrors: string[] = [];
  studentPage.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await signIn(studentPage, studentA.email, studentA.password);
  for (const path of [
    "/classes",
    `/classes/${state.classA}`,
    `/assignments/${state.practiceId}`,
    `/assignments/${state.practiceId}/results`,
    "/mistakes",
    "/progress",
    "/review",
  ]) {
    await studentPage.goto(path);
    const fits = await studentPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits, path).toBe(true);
  }
  await studentPage.goto(`/assignments/${state.practiceId}/results`);
  await studentPage.screenshot({
    path: "test-results/classroom-results-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  expect(consoleErrors).toEqual([]);
  await student.close();

  const teacher = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const teacherPage = await teacher.newPage();
  await signIn(teacherPage, TEACHER.email, TEACHER.password);
  for (const path of [`/teach/classes/${state.classA}`, `/teach/classes/${state.classA}/assign`]) {
    await teacherPage.goto(path);
    const fits = await teacherPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits, path).toBe(true);
  }
  await teacherPage.goto(`/teach/classes/${state.classA}`);
  await teacherPage.screenshot({
    path: "test-results/classroom-report-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  await teacher.close();
});
