import { expect, test } from "@playwright/test";

import { adminClient, becomeTeacher, createConfirmedStudent, RUN_ID, signIn } from "./support";

import type { Browser, Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const teacher = {
  email: `teach-learn-${RUN_ID}@example.test`,
  password: `teach-learn-${RUN_ID}`,
  name: `Cô Hạnh ${RUN_ID}`,
};
const LESSON_11 = "Bài 11 – Đếm số lượng, thời gian và số lần";
const LESSON_12 = "Bài 12 – Nói về chuyện đã qua và so sánh";
const CLASS_NAME = `Minna tối ${RUN_ID}`;
const SELF_STUDY_NAME = `Tự ôn N4 ${RUN_ID}`;
const state = { lesson11: "", lesson12: "", classId: "", code: "" };

async function teacherPage(browser: Browser) {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, teacher.email, teacher.password, "/teach");
  return page;
}

async function createFromStarter(page: Page, label: string) {
  await page.goto("/teach/lessons/new");
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForURL(/\/teach\/lessons\/lesson-[0-9a-f]{32}\/edit$/);
  const lessonId = page.url().split("/").at(-2) ?? "";
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await expect(page.getByText("1 phiên bản đã xuất bản.")).toBeVisible();
  return lessonId;
}

async function addToClass(page: Page, classId: string, lessonId: string) {
  await page.goto(`/teach/classes/${classId}/assign`);
  await page.locator("#class-lesson").selectOption(lessonId);
  await page.getByRole("button", { name: "Lưu vào lớp", exact: true }).click();
  await expect(page.getByText("Đã cập nhật nội dung lớp.")).toBeVisible();
}

test("a pinned daily source stays when the next lesson opens in the class", async ({ browser }) => {
  await createConfirmedStudent(teacher.email, teacher.password, teacher.name);
  const page = await (await browser.newContext()).newPage();
  await signIn(page, teacher.email, teacher.password, "/teach/start");
  await becomeTeacher(page, teacher.email);
  state.lesson11 = await createFromStarter(page, "Tạo bài 11 từ mẫu");
  state.lesson12 = await createFromStarter(page, "Tạo bài 12 từ mẫu");

  await page.goto("/teach/classes");
  await page.getByLabel("Tên lớp", { exact: true }).fill(CLASS_NAME);
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  state.classId = page.url().split("/").at(-1) ?? "";
  state.code = ((await page.locator(".join-code").textContent()) ?? "").replace("-", "");
  await addToClass(page, state.classId, state.lesson11);

  await page.goto(`/teach/classes/${state.classId}`);
  await expect(
    page.getByText(`tự động từ bài mới nhất đã mở có câu hỏi: «${LESSON_11}»`),
  ).toBeVisible();
  await page.getByLabel("Mỗi ngày tự giao").selectOption("60");
  await page.getByLabel("Lấy câu từ").selectOption({ label: LESSON_11 });
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByText("Đã bật: mỗi sáng 6:00 Reng tự giao 60 câu")).toBeVisible();
  await expect(
    page.getByText(`Đang lấy câu từ «${LESSON_11}» (50 câu chọn/điền), giữ nguyên`),
  ).toBeVisible();
  // Fifty questions for a sixty-question day: every question comes back daily.
  await expect(page.getByText("ít hơn 60 câu mỗi ngày")).toBeVisible();

  await addToClass(page, state.classId, state.lesson12);
  await page.goto(`/teach/classes/${state.classId}`);
  await expect(page.getByText(`Đang lấy câu từ «${LESSON_11}»`)).toBeVisible();
  await expect(page.getByLabel("Lấy câu từ")).toHaveValue(state.lesson11);
  await page.getByLabel("Lấy câu từ").selectOption("");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByText(`từ bài mới nhất đã mở có câu hỏi: «${LESSON_12}»`)).toBeVisible();
  await page.context().close();
});

test("the teaching log keeps the last slide and reopens it", async ({ browser }) => {
  const page = await teacherPage(browser);
  await page.goto(`/teach/classes/${state.classId}`);
  await expect(page.getByText("Chưa ghi buổi dạy nào.")).toBeVisible();
  await page.getByLabel("Bài đã dạy").selectOption(state.lesson11);
  await page.getByLabel("Dạy đến slide số").fill("12");
  await page.getByLabel("Ghi chú", { exact: true }).fill("Học viên còn nhầm 〜つ và 〜人.");
  await page.getByRole("button", { name: "Ghi buổi dạy", exact: true }).click();
  await expect(page.getByText("Đã ghi buổi dạy vào nhật ký.")).toBeVisible();
  await expect(page.getByText(`${LESSON_11} (phiên bản 1), đến slide 12`)).toBeVisible();
  await expect(page.getByText("Học viên còn nhầm 〜つ và 〜人.")).toBeVisible();
  await expect(page.getByText(/^Buổi gần nhất/)).toContainText(`${LESSON_11}, đến slide 12`);
  // The form starts empty again for the next session.
  await expect(page.getByLabel("Dạy đến slide số")).toHaveValue("");

  await page.setViewportSize({ width: 360, height: 780 });
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  expect(fits, "the class page with the teaching log fits a 360px screen").toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.getByRole("link", { name: "Mở slide 12" }).first().click();
  await expect(page.getByTestId("slide-counter")).toHaveText("12 / 38");
  await page.goto(`/teach/classes/${state.classId}`);
  // The deleted row, with its button, leaves the list; the empty log is the confirmation.
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(page.getByText("Chưa ghi buổi dạy nào.")).toBeVisible();
  await expect(page.getByText(/^Buổi gần nhất/)).toHaveCount(0);
  await page.context().close();
});

test("a teacher studies in a self-study class, never as a learner of their own class", async ({
  browser,
}) => {
  const page = await teacherPage(browser);
  await page.goto(`/join-class?code=${state.code}`);
  await page.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await expect(page.getByText("Đây là lớp bạn đang dạy")).toBeVisible();

  await page.goto("/teach/classes");
  await page.getByLabel("Tên lớp", { exact: true }).fill(SELF_STUDY_NAME);
  await page.getByLabel(/Lớp tự học của tôi/).check();
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  const selfStudyId = page.url().split("/").at(-1) ?? "";
  await expect(page.getByText("Lớp tự học: bạn là học viên duy nhất.")).toBeVisible();
  await expect(page.locator(".join-code")).toHaveCount(0);
  await expect(page.getByRole("row", { name: new RegExp(teacher.name) })).toBeVisible();
  await expect(page.getByLabel("Số học viên tối đa")).toHaveCount(0);

  await addToClass(page, selfStudyId, state.lesson12);
  await page.goto(`/teach/classes/${selfStudyId}`);
  await expect(page.getByRole("heading", { name: "Nhật ký buổi dạy" })).toHaveCount(0);
  await page.getByLabel("Mỗi ngày tự giao").selectOption("7");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByText("Đã bật: mỗi sáng 6:00 Reng tự giao 7 câu")).toBeVisible();
  await page.getByRole("button", { name: "Giao bài hôm nay ngay", exact: true }).click();
  await expect(page.getByText("Đã giao bài luyện hôm nay (7 câu)")).toBeVisible();

  await page.goto("/classes");
  const selfStudyItem = page.locator(".item-list li").filter({ hasText: SELF_STUDY_NAME });
  await expect(selfStudyItem).toContainText("Lớp tự học của bạn");
  await expect(page.locator(".item-list li").filter({ hasText: CLASS_NAME })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Luyện tập hằng ngày/ })).toBeVisible();
  await page.goto("/teach");
  await expect(page.locator(".item-list li").filter({ hasText: SELF_STUDY_NAME })).toContainText(
    "lớp tự học của bạn",
  );
  await page.context().close();
});

test("a lesson made from a starter is refreshed with the latest starter content", async ({
  browser,
}) => {
  const page = await teacherPage(browser);
  // A draft made before the starter gained its pictures.
  const { data, error } = await adminClient()
    .from("lessons")
    .select("draft_content, draft_revision")
    .eq("id", state.lesson12)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  const content = data.draft_content as { vocab: Record<string, unknown>[] };
  const { error: updateError } = await adminClient()
    .from("lessons")
    .update({
      draft_content: {
        ...content,
        vocab: content.vocab.map((item) => ({ ...item, image: undefined })),
      },
      draft_revision: data.draft_revision + 1,
    })
    .eq("id", state.lesson12);
  if (updateError) {
    throw new Error(updateError.message);
  }

  await page.goto("/teach");
  await page
    .locator(".item-list li")
    .filter({ hasText: LESSON_12 })
    .getByRole("link", { name: "Cập nhật từ mẫu" })
    .click();
  await page.waitForURL(`**/teach/lessons/${state.lesson12}/starter`);
  const current = page.locator(".item-list li").filter({ hasText: "Bản nháp của bạn" });
  const latest = page.locator(".item-list li").filter({ hasText: "Mẫu mới nhất" });
  await expect(latest).toContainText("41 slide, 50 câu hỏi");
  const latestText = (await latest.locator(".item-meta").textContent()) ?? "";
  await expect(current.locator(".item-meta")).not.toHaveText(latestText);

  await page.getByLabel(/Tôi hiểu bản nháp hiện tại/).check();
  await page.getByRole("button", { name: "Thay bản nháp bằng mẫu mới nhất", exact: true }).click();
  await page.waitForURL(`**/teach/lessons/${state.lesson12}/edit`);
  await expect(page.getByText("1 phiên bản đã xuất bản.")).toBeVisible();
  await page.goto(`/teach/lessons/${state.lesson12}/starter`);
  await expect(current.locator(".item-meta")).toHaveText(latestText);
  await page.context().close();
});
