import { expect, test } from "@playwright/test";

import { becomeTeacher, createConfirmedStudent, readEmailLink, RUN_ID, signIn } from "./support";

import type { Browser, Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const teacher = {
  email: `minna-teacher-${RUN_ID}@example.test`,
  password: `minna-teach-${RUN_ID}`,
  name: `Thầy Việt ${RUN_ID}`,
};
const learner = {
  email: `minna-learner-${RUN_ID}@example.test`,
  password: `minna-learn-${RUN_ID}`,
  name: `Phạm Thu Trang ${RUN_ID}`,
};
const LESSON_TITLE = "Bài 11 – Đếm số lượng, thời gian và số lần";
const CLASS_NAME = `Minna sơ cấp ${RUN_ID}`;
const ASSIGNMENT_TITLE = `Luyện bài 11 ${RUN_ID}`;
const CHOICE_PROMPT = "いすが 8（　　）あります。";
const FILL_PROMPT = "Viết cách đọc bằng hiragana: 2人";
// The answer ends in ん, which a learner usually types as a single final n.
const FINAL_N_PROMPT = "Viết cách đọc bằng hiragana: 4人";
const state = { lessonId: "", classId: "", code: "" };

async function teacherPage(browser: Browser) {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, teacher.email, teacher.password, "/teach");
  return page;
}

async function openSlide(page: Page, position: number) {
  await page.goto(`/lessons/${state.lessonId}/slide#${position}`);
  await expect(page.getByTestId("slide-counter")).toHaveText(`${position} / 38`);
  return page.locator(".reveal section.present");
}

test("a teacher starts Minna lesson 11 from the starter, publishes and presents it", async ({
  browser,
}) => {
  await createConfirmedStudent(teacher.email, teacher.password, teacher.name);
  const page = await (await browser.newContext()).newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await signIn(page, teacher.email, teacher.password, "/teach/start");
  await becomeTeacher(page, teacher.email);
  await page.getByRole("link", { name: "Tạo bài mới", exact: true }).click();
  await expect(page.getByText("Minna no Nihongo Sơ cấp I · 54 từ vựng")).toBeVisible();
  await page.getByRole("button", { name: "Tạo bài 11 từ mẫu", exact: true }).click();
  await page.waitForURL(/\/teach\/lessons\/lesson-[0-9a-f]{32}\/edit$/);
  state.lessonId = page.url().split("/").at(-2) ?? "";
  await expect(page.getByLabel("Tiêu đề tiếng Việt", { exact: true })).toHaveValue(LESSON_TITLE);
  await expect(page.locator(".slide-list-item")).toHaveCount(38);
  await page.locator(".slide-list-select").filter({ hasText: "Hội thoại 1" }).click();
  await expect(page.getByLabel("Câu tiếng Nhật lượt 1")).toHaveValue(/ご家族\|ごかぞく/);
  await expect(page.locator(".slide-preview ruby").first()).toBeVisible();

  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText("Đã xuất bản phiên bản mới");
  // The editor refreshes after publishing; leaving mid-refresh aborts its request.
  await expect(page.getByText("1 phiên bản đã xuất bản.")).toBeVisible();

  const table = await openSlide(page, 12);
  await expect(table.locator(".slide-table tbody tr")).toHaveCount(11);
  await expect(table.locator("th ruby").first()).toContainText("人");
  const drill = await openSlide(page, 17);
  const answer = drill.locator("tbody tr").first().locator("td").last();
  await expect(answer).toHaveClass(/fragment/);
  await expect(answer).not.toHaveClass(/visible/);
  await page.getByRole("button", { name: "Tiếp", exact: true }).click();
  await expect(answer).toHaveClass(/visible/);
  const dialogue = await openSlide(page, 31);
  await expect(dialogue.locator(".slide-dialogue-ja > li")).toHaveCount(6);
  await expect(dialogue.locator("rt").first()).toHaveText("せんせい");
  await page.screenshot({ path: "test-results/minna-dialogue-slide.png", caret: "initial" });
  expect(consoleErrors, "editor and slides render without errors").toEqual([]);
  await page.context().close();
});

test("the teacher opens a Japanese class, pins lesson 11 and assigns practice", async ({
  browser,
}) => {
  const page = await teacherPage(browser);
  await page.goto("/teach/classes");
  await expect(page.getByLabel("Ngôn ngữ học")).toHaveValue("ja-JP");
  await page.getByLabel("Tên lớp", { exact: true }).fill(CLASS_NAME);
  await page.getByLabel("Số học viên tối đa").fill("10");
  await page.getByLabel("Link Google Meet").fill("https://meet.google.com/abc-defg-hij");
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  state.classId = page.url().split("/").at(-1) ?? "";
  state.code = ((await page.locator(".join-code").textContent()) ?? "").replace("-", "");

  await page.goto(`/teach/classes/${state.classId}/assign`);
  await page.locator("#class-lesson").selectOption(state.lessonId);
  await page.getByRole("button", { name: "Lưu vào lớp", exact: true }).click();
  await expect(page.getByText("Đã cập nhật nội dung lớp.")).toBeVisible();
  await page.getByLabel("Tiêu đề", { exact: true }).fill(ASSIGNMENT_TITLE);
  await page.getByRole("checkbox", { name: CHOICE_PROMPT }).check();
  await page.getByRole("checkbox", { name: FILL_PROMPT }).check();
  await page.getByRole("checkbox", { name: FINAL_N_PROMPT }).check();
  await page.getByRole("button", { name: "Xem lại và xuất bản", exact: true }).click();
  await page.getByRole("button", { name: "Xuất bản bài giao", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  await expect(page.getByText(ASSIGNMENT_TITLE)).toBeVisible();
  await page.context().close();
});

test("a learner signs up, confirms the email, joins and completes the lesson 11 practice", async ({
  page,
}) => {
  await page.goto(`/join-class?code=${state.code}`);
  await page.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await page.waitForURL(/\/sign-in\?next=/);
  await page.getByRole("link", { name: "Tạo tài khoản học viên", exact: true }).click();
  await page.getByLabel("Họ tên", { exact: true }).fill(learner.name);
  await page.getByLabel("Email", { exact: true }).fill(learner.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(learner.password);
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kiểm tra hộp thư của bạn" })).toBeVisible();
  await page.goto(await readEmailLink(learner.email, "Xác nhận email Reng"));
  await page.waitForURL(/\/join-class\?code=/);
  await page.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await page.waitForURL(`**/classes/${state.classId}`);
  await expect(page.getByRole("link", { name: "Vào Google Meet" })).toBeVisible();
  await expect(page.getByText(`1. ${LESSON_TITLE}`)).toBeVisible();

  await page.getByRole("link", { name: "Đọc bài", exact: true }).click();
  await expect(page.getByRole("heading", { name: LESSON_TITLE })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hội thoại", exact: true })).toBeVisible();
  await expect(page.locator(".example-block ruby").first()).toBeVisible();
  await expect(page.getByText("Xem câu mẫu").first()).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  expect(fits, "the reader with wide tables fits a 360px screen").toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto(`/classes/${state.classId}`);
  await page.getByRole("link", { name: ASSIGNMENT_TITLE, exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu làm bài", exact: true }).click();
  await page.getByRole("radio", { name: "つ", exact: true }).check();
  const reading = page.getByLabel(FILL_PROMPT);
  await reading.pressSequentially("futari");
  await expect(reading).toHaveValue("ふたり");
  const finalN = page.getByLabel(FINAL_N_PROMPT);
  await finalN.pressSequentially("yonin");
  await expect(finalN).toHaveValue("よにn");
  await reading.focus();
  await expect(finalN).toHaveValue("よにん");
  await expect(page.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
  await page.waitForURL(/\/assignments\/[0-9a-f-]{36}\/results$/);
  await expect(page.locator(".result-score")).toContainText("100%");
  await expect(page.getByText("Đạt", { exact: true })).toBeVisible();
});

test("the teacher sees the learner's result in the class report", async ({ browser }) => {
  const page = await teacherPage(browser);
  await page.goto(`/teach/classes/${state.classId}`);
  const row = page.getByRole("row", { name: new RegExp(learner.name) });
  await expect(row).toContainText("1/1");
  await expect(row).toContainText("100%");
  await expect(row).toContainText("Đạt");
  await page.context().close();
});
