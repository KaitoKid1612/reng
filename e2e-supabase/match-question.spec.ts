import { expect, test } from "@playwright/test";

import { toVietnamInput } from "../lib/vietnam-time";

import { adminClient, createConfirmedStudent, RUN_ID, signIn, TEACHER } from "./support";

import type { Locator, Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const LESSON_ID = `match-${RUN_ID}`;
const PROMPT = "Ghép mỗi từ với nghĩa tiếng Việt.";
const PAIRS = [
  ["いぬ", "chó"],
  ["ねこ", "mèo"],
  ["とり", "chim"],
] as const;
const TEST_PROMPT = "Ghép mỗi số với cách đọc.";
const TEST_PAIRS = [
  ["一", "いち"],
  ["二", "に"],
  ["三", "さん"],
] as const;
const learner = {
  email: `match-learner-${RUN_ID}@example.test`,
  password: `match-pass-${RUN_ID}`,
  name: `Học viên ghép đôi ${RUN_ID}`,
};

async function openSection(page: Page, name: RegExp) {
  const summary = page.locator("summary").filter({ hasText: name });
  if ((await summary.locator("..").getAttribute("open")) === null) {
    await summary.click();
  }
}

async function publishAssignment(page: Page) {
  await page.getByRole("button", { name: "Xem lại trước khi giao", exact: true }).click();
  await page.getByRole("button", { name: "Giao bài cho lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}\?assigned=[0-9a-f-]{36}/);
}

// Each item on the left has a menu of lettered items ("B. chó"); the letters follow the shuffle.
async function pick(card: Locator, left: string, right: string) {
  const menu = card.getByLabel(left, { exact: true });
  const value = await menu
    .locator("option")
    .filter({ hasText: new RegExp(`^[A-H]\\. ${right}$`) })
    .getAttribute("value");
  await menu.selectOption(value ?? "");
}

test("a teacher writes matching questions and a learner pairs them on a phone", async ({
  page,
  browser,
}) => {
  await signIn(page, TEACHER.email, TEACHER.password, "/teach");
  await page.getByRole("link", { name: "Tạo bài mới", exact: true }).click();
  await page.getByLabel("Mã bài", { exact: true }).fill(LESSON_ID);
  await page.getByLabel("Thứ tự trong khóa", { exact: true }).fill("93");
  await page.getByLabel("Tiêu đề tiếng Việt", { exact: true }).fill(`Ghép đôi ${RUN_ID}`);
  await page.getByRole("button", { name: "Tạo và mở editor", exact: true }).click();
  await page.waitForURL(`**/teach/lessons/${LESSON_ID}/edit`);
  await page.getByLabel("Tiêu đề tiếng Nhật", { exact: true }).fill("どうぶつ");
  await page.getByLabel("Tóm tắt", { exact: true }).fill("Ghép tên con vật với nghĩa.");
  await page.getByLabel("Loại slide mới").selectOption({ label: "Tiêu đề" });
  await page.getByRole("button", { name: "Thêm slide", exact: true }).click();
  await page.getByLabel("Dòng tiếng Nhật", { exact: true }).fill("どうぶつ");
  await page.getByLabel("Dòng tiếng Việt", { exact: true }).fill(`Ghép đôi ${RUN_ID}`);

  await openSection(page, /^Câu luyện/);
  await page.getByRole("button", { name: "Thêm câu ghép đôi", exact: true }).click();
  const editor = page.getByRole("group", { name: "Câu 1: ghép đôi" });
  await editor.getByLabel("Đề bài", { exact: true }).fill(PROMPT);
  await editor.getByLabel(/Cột trái/).fill(PAIRS.map(([left]) => left).join("\n"));
  await editor.getByLabel(/Cột phải/).fill("chó\nmèo");
  await editor.getByLabel("Giải thích đáp án", { exact: true }).fill("いぬ là chó, ねこ là mèo.");
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await expect(
    page.getByText(/Câu luyện 1: mỗi dòng bên trái cần đúng một dòng bên phải/),
  ).toBeVisible();
  await editor.getByLabel(/Cột phải/).fill(PAIRS.map(([, right]) => right).join("\n"));
  await expect(editor.getByText("Các cặp đúng:")).toContainText(
    "いぬ → chó · ねこ → mèo · とり → chim",
  );
  await editor.screenshot({ path: "test-results/match-question-editor.png" });
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText("Đã xuất bản phiên bản mới");
  // The draft keeps the columns as typed, row by row.
  await page.reload();
  await openSection(page, /^Câu luyện/);
  const saved = page.getByRole("group", { name: "Câu 1: ghép đôi" });
  await expect(saved.getByLabel(/Cột trái/)).toHaveValue("いぬ\nねこ\nとり");
  await expect(saved.getByLabel(/Cột phải/)).toHaveValue("chó\nmèo\nchim");

  await page.goto("/teach/classes");
  await page.getByLabel("Tên lớp", { exact: true }).fill(`Lớp ghép đôi ${RUN_ID}`);
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  const classId = page.url().split("/").at(-1) ?? "";
  const code = ((await page.locator(".join-code").textContent()) ?? "").replace("-", "");
  await page.goto(`/teach/classes/${classId}/assign`);
  await page.locator("#class-lesson").selectOption(LESSON_ID);
  await page.getByRole("button", { name: "Lưu vào lớp", exact: true }).click();
  await expect(page.getByText("Đã cập nhật nội dung lớp.")).toBeVisible();
  const practiceTitle = `Luyện ghép đôi ${RUN_ID}`;
  await page.getByLabel("Tiêu đề", { exact: true }).fill(practiceTitle);
  await page.getByRole("checkbox", { name: new RegExp(PROMPT) }).check();
  await publishAssignment(page);

  // A test question written on the assignment page.
  await page.goto(`/teach/classes/${classId}/assign`);
  const testTitle = `Kiểm tra ghép đôi ${RUN_ID}`;
  await page.getByLabel("Tiêu đề", { exact: true }).fill(testTitle);
  await page.getByRole("radio", { name: "Kiểm tra", exact: true }).check();
  await page
    .getByLabel("Hạn nộp (giờ Việt Nam)")
    .fill(toVietnamInput(new Date(Date.now() + 86_400_000).toISOString()));
  await page.getByRole("button", { name: "Thêm câu ghép đôi", exact: true }).click();
  const testEditor = page.getByRole("group", { name: "Câu 1: ghép đôi" });
  await testEditor.getByLabel("Đề bài", { exact: true }).fill(TEST_PROMPT);
  await testEditor.getByLabel(/Cột trái/).fill(TEST_PAIRS.map(([left]) => left).join("\n"));
  await testEditor.getByLabel(/Cột phải/).fill(TEST_PAIRS.map(([, right]) => right).join("\n"));
  await testEditor.getByLabel("Giải thích đáp án", { exact: true }).fill("一 đọc là いち.");
  await publishAssignment(page);

  await createConfirmedStudent(learner.email, learner.password, learner.name);
  const student = await (
    await browser.newContext({ viewport: { width: 390, height: 844 } })
  ).newPage();
  try {
    await signIn(student, learner.email, learner.password, "/join-class");
    await student.getByLabel("Mã lớp", { exact: true }).fill(code);
    await student.getByRole("button", { name: "Vào lớp", exact: true }).click();
    await student.waitForURL(`**/classes/${classId}`);
    await student.getByRole("link", { name: practiceTitle, exact: true }).click();
    await student.getByRole("button", { name: "Bắt đầu làm bài", exact: true }).click();
    const card = student.locator(".question-card").filter({ hasText: PROMPT });
    await expect(card.getByRole("list", { name: "Các mục để ghép" }).locator("li")).toHaveCount(3);
    // Choosing an item another row already has moves it to the new row.
    await pick(card, "いぬ", "mèo");
    await pick(card, "ねこ", "mèo");
    await expect(card.getByLabel("いぬ", { exact: true })).toHaveValue("");
    for (const [left, right] of PAIRS) {
      await pick(card, left, right);
    }
    await expect(student.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
    await card.getByRole("button", { name: "Kiểm tra câu này", exact: true }).click();
    await expect(card.getByText("Đúng rồi!")).toBeVisible();
    await student.screenshot({
      path: "test-results/match-question-learner-390.png",
      fullPage: true,
    });
    expect(
      await student.evaluate(() => document.documentElement.scrollWidth),
      "no sideways scrolling on a phone",
    ).toBeLessThanOrEqual(390);
    // The checked last question offers Nộp bài in place of Câu sau; the submit bar has its own.
    await student.getByRole("button", { name: "Nộp bài", exact: true }).last().click();
    await student.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
    await student.waitForURL(/\/results$/);
    await expect(student.locator(".result-score")).toContainText("100%");
    await expect(student.getByText("いぬ → chó · ねこ → mèo · とり → chim").first()).toBeVisible();

    // One pair wrong in the test: the stored answer is graded wrong.
    await student.goto(`/classes/${classId}`);
    await student.getByRole("link", { name: testTitle, exact: true }).click();
    await student.getByRole("button", { name: "Bắt đầu làm bài", exact: true }).click();
    const testCard = student.locator(".question-card").filter({ hasText: TEST_PROMPT });
    await pick(testCard, "一", "いち");
    await pick(testCard, "二", "さん");
    await pick(testCard, "三", "に");
    await expect(student.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
    await student.getByRole("button", { name: "Nộp bài", exact: true }).click();
    await student.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
    await student.waitForURL(/\/results$/);
    const { data: tests } = await adminClient()
      .from("assignments")
      .select("id")
      .eq("class_id", classId)
      .eq("title", testTitle);
    const { data: submissions } = await adminClient()
      .from("submissions")
      .select("id")
      .eq("assignment_id", tests?.[0]?.id ?? "")
      .eq("status", "submitted");
    const { data: answers } = await adminClient()
      .from("answers")
      .select("is_correct, raw")
      .eq("submission_id", submissions?.[0]?.id ?? "");
    expect(answers?.map((answer) => answer.is_correct)).toEqual([false]);
    expect(answers?.[0]?.raw).toHaveLength(3);
  } finally {
    await student.context().close();
  }
});
