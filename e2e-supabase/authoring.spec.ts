import { expect, test } from "@playwright/test";

import { RUN_ID, signIn, TEACHER } from "./support";

import type { Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const LESSON_ID = `e2e-${RUN_ID}`;
const LESSON_TITLE = `Mua sắm ${RUN_ID}`;
const EDITOR_PATH = `/teach/lessons/${LESSON_ID}/edit`;

async function openSection(page: Page, name: RegExp) {
  const summary = page.locator("summary").filter({ hasText: name });
  if ((await summary.locator("..").getAttribute("open")) === null) {
    await summary.click();
  }
}

async function addSlide(page: Page, type: string) {
  await page.getByLabel("Loại slide mới").selectOption({ label: type });
  await page.getByRole("button", { name: "Thêm slide", exact: true }).click();
}

test("teacher builds a lesson from scratch and learners can read the published version", async ({
  page,
  browser,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await signIn(page, TEACHER.email, TEACHER.password, "/teach");
  await page.getByRole("link", { name: "Tạo bài mới", exact: true }).click();
  await page.getByLabel("Mã bài", { exact: true }).fill(LESSON_ID);
  await page.getByLabel("Thứ tự trong khóa", { exact: true }).fill("90");
  await page.getByLabel("Tiêu đề tiếng Việt", { exact: true }).fill(LESSON_TITLE);
  await page.getByRole("button", { name: "Tạo và mở editor", exact: true }).click();
  await page.waitForURL(`**${EDITOR_PATH}`);

  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  const problems = page.getByRole("region", { name: "Cần sửa trước khi xuất bản" });
  await expect(problems).toContainText("Nhập tiêu đề tiếng Nhật.");
  await expect(problems).toContainText("Bài cần ít nhất một slide.");

  await page.getByLabel("Tiêu đề tiếng Nhật", { exact: true }).fill("かいもの");
  await page.getByLabel("Tóm tắt", { exact: true }).fill("Hỏi giá và mua đồ ở cửa hàng.");
  await openSection(page, /^Từ vựng/);
  await page.getByRole("button", { name: "Thêm từ", exact: true }).click();
  await page.getByLabel("Cách đọc kana từ 1").fill("いくら");
  await page.getByLabel("Romaji từ 1").fill("ikura");
  await page.getByLabel("Nghĩa từ 1").fill("bao nhiêu tiền");
  await openSection(page, /^Ngữ pháp/);
  await page.getByRole("button", { name: "Thêm mẫu câu", exact: true }).click();
  await page.getByLabel("Mẫu", { exact: true }).fill("N は いくらですか");
  await page.getByLabel("Nghĩa", { exact: true }).fill("N giá bao nhiêu?");
  await page.getByLabel("Giải thích", { exact: true }).fill("Dùng để hỏi giá một món đồ.");
  await page.getByLabel("Câu ví dụ 1 tiếng Nhật").fill("これは いくらですか。");
  await page.getByLabel("Câu ví dụ 1 nghĩa").fill("Cái này bao nhiêu tiền?");
  await openSection(page, /^Câu luyện/);
  await page.getByRole("button", { name: "Thêm câu trắc nghiệm", exact: true }).click();
  await page.getByLabel("Đề bài", { exact: true }).fill("これは ___ですか。");
  await page.getByLabel("Nội dung lựa chọn 1").fill("いくら");
  await page.getByLabel("Nội dung lựa chọn 2").fill("だれ");
  await page.getByLabel("Lựa chọn 1 là đáp án đúng").check();
  await page.getByLabel("Giải thích đáp án", { exact: true }).fill("いくら hỏi giá tiền.");

  await addSlide(page, "Tiêu đề");
  await page.getByLabel("Dòng tiếng Nhật", { exact: true }).fill("第90課 かいもの");
  await page.getByLabel("Dòng tiếng Việt", { exact: true }).fill(LESSON_TITLE);
  await expect(page.locator(".slide-preview")).toContainText("第90課 かいもの");
  await addSlide(page, "Câu luyện");
  await page.getByLabel("Câu luyện", { exact: true }).selectOption({ label: "これは ___ですか。" });
  await addSlide(page, "Từ vựng");
  await page.getByRole("checkbox", { name: /いくら/ }).check();
  await expect(page.locator(".slide-preview")).toContainText("bao nhiêu tiền");
  await page.getByRole("button", { name: "Đưa slide 3 lên", exact: true }).click();
  await expect(page.locator(".slide-list-item").nth(1)).toContainText("Từ vựng");

  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText("Đã lưu nháp lúc");
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText("Đã xuất bản phiên bản mới");
  await expect(page.getByText("1 phiên bản đã xuất bản.")).toBeVisible();
  await page.screenshot({
    path: "test-results/editor-desktop.png",
    fullPage: true,
    caret: "initial",
  });

  expect(consoleErrors, "editor pages hydrate without errors").toEqual([]);

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto("/lessons");
  await expect(visitor.getByRole("heading", { name: LESSON_TITLE })).toHaveCount(0);
  await page.getByLabel("Ai có thể đọc bản đã xuất bản?").selectOption("public");
  await page.getByLabel(/Nếu chọn công khai/).check();
  await page.getByRole("button", { name: "Lưu quyền đọc", exact: true }).click();
  await expect(page.getByText(/Đã cập nhật quyền đọc/)).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByRole("heading", { name: LESSON_TITLE })).toBeVisible();
  await visitor.goto(`/lessons/${LESSON_ID}`);
  await expect(visitor.getByText("bao nhiêu tiền", { exact: true })).toBeVisible();
  await expect(visitor.locator(".sample-notice")).toHaveCount(0);
  await visitor.context().close();
});

test("concurrent editors see a conflict and choose the server copy or an explicit overwrite", async ({
  browser,
}) => {
  const first = await (await browser.newContext()).newPage();
  await signIn(first, TEACHER.email, TEACHER.password, EDITOR_PATH);
  const second = await first.context().newPage();
  await second.goto(EDITOR_PATH);

  await first.getByLabel("Tóm tắt", { exact: true }).fill("Bản từ tab thứ nhất.");
  await first.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(first.locator(".editor-status")).toContainText("Đã lưu nháp lúc");
  await second.getByLabel("Tóm tắt", { exact: true }).fill("Bản từ tab thứ hai.");
  await second.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(second.getByRole("alert").filter({ hasText: "Bản trên máy chủ" })).toBeVisible();
  await second.getByRole("button", { name: "Tải bản trên máy chủ", exact: true }).click();
  await expect(second.getByLabel("Tóm tắt", { exact: true })).toHaveValue("Bản từ tab thứ nhất.");

  await first.getByLabel("Tóm tắt", { exact: true }).fill("Tab một sửa tiếp.");
  await first.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(first.locator(".editor-status")).toContainText("Đã lưu nháp lúc");
  await second.getByLabel("Tóm tắt", { exact: true }).fill("Tab hai ghi đè có chủ đích.");
  await second.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await second.getByRole("button", { name: "Ghi đè bằng bản này", exact: true }).click();
  await expect(second.locator(".editor-status")).toContainText("Đã lưu nháp lúc");
  await first.reload();
  await expect(first.getByLabel("Tóm tắt", { exact: true })).toHaveValue(
    "Tab hai ghi đè có chủ đích.",
  );
  await first.context().close();
});

test("vocabulary import reports each line and appends only valid new words", async ({ page }) => {
  await signIn(page, TEACHER.email, TEACHER.password, `/teach/import-csv?lesson=${LESSON_ID}`);
  await page.getByLabel("File CSV UTF-8").setInputFiles({
    name: "excel-ansi.csv",
    mimeType: "text/csv",
    buffer: Buffer.from([0x6a, 0x70, 0x2c, 0x76, 0x69, 0x0a, 0xf0, 0xe8]),
  });
  await expect(page.getByText("CSV UTF-8 (Comma delimited)")).toBeVisible();
  await page
    .getByLabel(/Hoặc dán bảng/)
    .fill(
      "jp\tkanji\tromaji\tnghĩa\nたかい\t高い\ttakai\tđắt\n安い\t\tyasui\trẻ\nいくら\t\tikura\tbao nhiêu tiền\n",
    );
  const rows = page.locator(".data-table tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Hợp lệ");
  await expect(rows.nth(1)).toContainText("kanji đặt ở cột kanji");
  await expect(rows.nth(2)).toContainText("đã có trong bài");
  await page.getByRole("button", { name: "Thêm 1 từ vào bản nháp", exact: true }).click();
  await expect(page.getByText("Đã thêm 1 từ vào bản nháp.")).toBeVisible();
  await page.goto(EDITOR_PATH);
  await expect(page.locator("summary").filter({ hasText: /^Từ vựng/ })).toHaveText("Từ vựng (2)");
});

test("authoring and notification settings pages fit a 360px screen", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await context.newPage();
  await signIn(page, TEACHER.email, TEACHER.password);
  for (const path of [
    EDITOR_PATH,
    `/teach/import-csv?lesson=${LESSON_ID}`,
    "/settings/notifications",
  ]) {
    await page.goto(path);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits, path).toBe(true);
  }
  await page.goto(EDITOR_PATH);
  await page.screenshot({
    path: "test-results/editor-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  await context.close();
});
