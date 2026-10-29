import { expect, test } from "@playwright/test";

import { createConfirmedStudent, RUN_ID, signIn } from "./support";

import type { Browser, Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const LESSON_TITLE = `Chào hỏi tiếng Trung ${RUN_ID}`;
const ASSIGNMENT_TITLE = `Luyện chữ Hán ${RUN_ID}`;
const HANZI_PROMPT = /Viết chữ Hán của “cảm ơn”/;
const MEANING_PROMPT = /你好 \(nǐ hǎo\) nghĩa là gì/;
const PASTED_TABLE = [
  "Chữ Hán\tPinyin\tNghĩa\tCâu ví dụ\tPinyin câu ví dụ\tNghĩa câu ví dụ",
  "你好\tnǐ hǎo\txin chào\t你好，老师！\tNǐ hǎo, lǎoshī!\tChào thầy cô!",
  "谢谢\txièxie\tcảm ơn",
  "你好\tnǐhǎo\tchào",
  "nǐ hǎo\t你好\txin chào",
].join("\n");

const state = { lessonId: "", classId: "", code: "" };

async function newAccount(browser: Browser, role: "teacher" | "learner") {
  const email = `authoring-${role}-${RUN_ID}@example.test`;
  const password = `authoring-pass-${RUN_ID}`;
  await createConfirmedStudent(email, password, `Soạn bài ${role}`);
  const page = await (await browser.newContext()).newPage();
  await signIn(page, email, password, role === "teacher" ? "/teach/start" : "/classes");
  if (role === "teacher") {
    await page.getByLabel(/Tôi chịu trách nhiệm/).check();
    await page.getByRole("button", { name: "Kích hoạt giảng dạy", exact: true }).click();
    await page.waitForURL("**/teach");
  }
  return page;
}

async function goToStep(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
}

async function expectSaved(page: Page) {
  await expect(page.locator(".editor-status")).toContainText(/Đã lưu/, { timeout: 10_000 });
}

test("a teacher builds a Vietnamese–Chinese lesson from a template, reviews answers and publishes", async ({
  browser,
}) => {
  const page = await newAccount(browser, "teacher");
  await page.goto("/teach/lessons/new");
  await page.getByRole("radio", { name: /Dạy từ mới/ }).check();
  await page.getByLabel("Tên bài", { exact: true }).fill(LESSON_TITLE);
  await page.getByLabel("Mục tiêu nhỏ đầu tiên", { exact: true }).fill("Chào và cảm ơn");
  await page.getByRole("button", { name: "Tạo bài và bắt đầu soạn", exact: true }).click();
  await page.waitForURL(/\/teach\/lessons\/lesson-[a-f0-9]{32}\/edit$/);
  state.lessonId = page.url().split("/").at(-2) ?? "";
  await expect(page.getByLabel("Tên bài", { exact: true })).toHaveValue(LESSON_TITLE);
  await expect(page.getByLabel("Mục tiêu 1", { exact: true })).toHaveValue("Chào và cảm ơn");

  await page.getByRole("button", { name: "Bước tiếp", exact: true }).click();
  await page.getByText("Dán bảng từ Excel hoặc Google Sheets").click();
  await page.getByLabel("Nội dung dán", { exact: true }).fill(PASTED_TABLE);
  await page.getByRole("button", { name: "Xem trước bảng", exact: true }).click();
  const preview = page.locator(".teaching-paste table");
  await expect(preview.locator("tbody tr")).toHaveCount(4);
  await expect(preview).toContainText("Từ này đã có trong bài hoặc lặp lại ở dòng trên.");
  await expect(preview).toContainText("Cột 1 chưa có chữ Hán");
  await page.getByRole("button", { name: "Thêm 2 từ hợp lệ", exact: true }).click();
  await expect(page.getByLabel("Chữ Hán từ 1", { exact: true })).toHaveValue("你好");
  await expect(page.getByLabel("Pinyin từ 1", { exact: true })).toHaveValue("nǐ hǎo");
  await expect(page.getByLabel("Ví dụ 1 của từ 1: câu tiếng Trung")).toHaveValue("你好，老师！");
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expectSaved(page);

  await goToStep(page, "4. Câu luyện");
  await page.getByLabel("Tạo từ từ vựng", { exact: true }).selectOption({ label: "谢谢 – cảm ơn" });
  await page.getByLabel("Dạng câu", { exact: true }).selectOption("hanzi");
  await page.getByRole("button", { name: "Tạo khung câu", exact: true }).click();
  await page
    .getByLabel("Tạo từ từ vựng", { exact: true })
    .selectOption({ label: "你好 – xin chào" });
  await page.getByLabel("Dạng câu", { exact: true }).selectOption("meaning");
  await page.getByRole("button", { name: "Tạo khung câu", exact: true }).click();
  await expect(page.getByText("Chưa xác nhận đáp án")).toHaveCount(2);
  await page.getByRole("button", { name: "Lưu và xác nhận đáp án câu 1", exact: true }).click();
  await expect(page.getByText("Đã xác nhận đáp án", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Lưu và xác nhận đáp án câu 2", exact: true }).click();
  await expect(page.getByText("Đã xác nhận đáp án", { exact: true })).toHaveCount(2);
  // Editing a reviewed question needs a new review before publishing.
  await page.getByLabel("Giải thích câu 1", { exact: true }).fill("Chú ý viết 谢谢 hai lần 谢.");
  await expect(page.getByText("Đã xác nhận đáp án", { exact: true })).toHaveCount(1);

  await goToStep(page, "5. Slide & xuất bản");
  await page.getByRole("button", { name: "Dựng slide từ nội dung", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Sẽ thêm" })).toBeVisible();
  await page.getByRole("button", { name: "Áp dụng thay đổi slide", exact: true }).click();
  await expect(page.locator(".slide-list-item")).toHaveCount(8);
  await page.getByRole("button", { name: "Dựng slide từ nội dung", exact: true }).click();
  await expect(page.getByText("Slide đã khớp với nội dung, không có gì thay đổi.")).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Chọn slide 3", exact: true }).click();
  await expect(page.locator(".slide-preview [lang='zh-Hans']").first()).toHaveText("你好");
  await page.getByLabel("Ghi chú riêng của giáo viên", { exact: true }).fill(`NOTE-${RUN_ID}`);

  await page.getByRole("button", { name: "Lưu và xuất bản", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Xem trước và xuất bản" }).getByRole("alert"),
  ).toContainText("Xác nhận đáp án sau lần sửa cuối");
  await goToStep(page, "4. Câu luyện");
  await page.getByRole("button", { name: "Lưu và xác nhận đáp án câu 1", exact: true }).click();
  await expect(page.getByText("Đã xác nhận đáp án", { exact: true })).toHaveCount(2);
  await goToStep(page, "5. Slide & xuất bản");
  await page.getByRole("button", { name: "Lưu và xuất bản", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText("Đã xuất bản phiên bản mới");
  await expect(page.getByRole("link", { name: "Xem bản đã xuất bản" })).toBeVisible();

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/lessons/${state.lessonId}`);
  await expect(visitor.getByRole("heading", { name: LESSON_TITLE })).toHaveCount(0);
  await visitor.context().close();

  await page.goto("/teach/classes");
  await page.getByLabel("Tên lớp", { exact: true }).fill(`Lớp tiếng Trung ${RUN_ID}`);
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  state.classId = page.url().split("/").at(-1) ?? "";
  state.code = ((await page.locator(".join-code").textContent()) ?? "").replace("-", "");
  await page.goto(`/teach/classes/${state.classId}/assign`);
  await page.locator("#class-lesson").selectOption(state.lessonId);
  await page.getByRole("button", { name: "Lưu vào lớp", exact: true }).click();
  await expect(page.getByText("Đã cập nhật nội dung lớp.")).toBeVisible();
  await page.getByLabel("Tiêu đề", { exact: true }).fill(ASSIGNMENT_TITLE);
  await page.getByRole("checkbox", { name: HANZI_PROMPT }).check();
  await page.getByRole("checkbox", { name: MEANING_PROMPT }).check();
  await page.getByRole("button", { name: "Xem lại và xuất bản", exact: true }).click();
  await page.getByRole("button", { name: "Xuất bản bài giao", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  await page.context().close();
});

test("a learner reads the Chinese lesson, sees the slides and is graded with exact Chinese answers", async ({
  browser,
}) => {
  const page = await newAccount(browser, "learner");
  await page.goto("/join-class");
  await page.getByLabel("Mã lớp", { exact: true }).fill(state.code);
  await page.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await page.waitForURL(`**/classes/${state.classId}`);
  await page.getByRole("link", { name: "Đọc bài", exact: true }).click();
  await expect(page.getByRole("heading", { name: LESSON_TITLE, exact: true })).toBeVisible();
  await expect(page.getByText("Chào và cảm ơn", { exact: true })).toBeVisible();
  await expect(page.locator(".vocabulary-list [lang='zh-Hans']").first()).toHaveText("你好");
  expect(await page.content()).not.toContain(`NOTE-${RUN_ID}`);
  await page.getByRole("link", { name: "Trình chiếu", exact: true }).click();
  await expect(page.locator(".reveal")).toBeVisible();
  await expect(page.getByTestId("slide-counter")).toHaveText("1 / 8");

  await page.goto(`/classes/${state.classId}`);
  await page.getByRole("link", { name: ASSIGNMENT_TITLE, exact: true }).click();
  await page.waitForURL(/\/assignments\/[0-9a-f-]{36}$/);
  const assignmentUrl = page.url();
  await page.getByRole("button", { name: "Bắt đầu làm bài", exact: true }).click();
  const hanzi = page.locator(".question-card").filter({ hasText: HANZI_PROMPT });
  await hanzi.getByRole("textbox").fill("謝謝");
  await expect(page.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
  await hanzi.getByRole("button", { name: "Kiểm tra câu này", exact: true }).click();
  await expect(hanzi.getByText("Chưa đúng.")).toBeVisible();
  const meaning = page.locator(".question-card").filter({ hasText: MEANING_PROMPT });
  await meaning.getByRole("radio", { name: "xin chào", exact: true }).check();
  await expect(page.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
  await meaning.getByRole("button", { name: "Kiểm tra câu này", exact: true }).click();
  await expect(meaning.getByText("Đúng rồi!")).toBeVisible();
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
  await page.waitForURL(/\/results$/);
  await expect(page.locator(".result-score")).toContainText("50%");

  await page.goto(assignmentUrl);
  await page.getByRole("button", { name: "Làm lại lượt mới", exact: true }).click();
  await hanzi.getByRole("textbox").fill("谢谢");
  await meaning.getByRole("radio", { name: "xin chào", exact: true }).check();
  await expect(page.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
  await page.waitForURL(/\/results$/);
  await expect(page.locator(".result-score")).toContainText("100%");
  await page.context().close();
});
