import { expect, test } from "@playwright/test";

import { becomeTeacher, createConfirmedStudent, RUN_ID, signIn } from "./support";

import type { Browser } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const teacher = {
  email: `n4-teacher-${RUN_ID}@example.test`,
  password: `n4-teach-${RUN_ID}`,
  name: `Cô Mai ${RUN_ID}`,
};
const learner = {
  email: `n4-learner-${RUN_ID}@example.test`,
  password: `n4-learn-${RUN_ID}`,
  name: `Nguyễn Văn Việt ${RUN_ID}`,
};
const DECK_TITLE = "Tổng ôn N4 · 4 – Điều kiện và thời gian";
const CLASS_NAME = `Ôn N4 ${RUN_ID}`;
const ASSIGNMENT_TITLE = `Luyện điều kiện ${RUN_ID}`;
// n4g4-q01, tagged with the 〜ば point of the same deck.
const PROMPT_PART = "わからないんですが、どう";
const state = { lessonId: "", classId: "", code: "" };

async function teacherPage(browser: Browser) {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, teacher.email, teacher.password, "/teach");
  return page;
}

test("a teacher makes an N4 review deck from its starter and gives the class practice", async ({
  browser,
}) => {
  await createConfirmedStudent(teacher.email, teacher.password, teacher.name);
  const page = await (await browser.newContext()).newPage();
  await signIn(page, teacher.email, teacher.password, "/teach/start");
  await becomeTeacher(page, teacher.email);

  await page.goto("/teach/lessons/new");
  await expect(page.getByRole("heading", { name: "Tổng ôn ngữ pháp JLPT N4" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tạo bản đồ ngữ pháp N4" })).toBeVisible();
  await page.getByRole("button", { name: "Tạo tổng ôn N4 · 4", exact: true }).click();
  await page.waitForURL(/\/teach\/lessons\/lesson-[0-9a-f]{32}\/edit$/);
  state.lessonId = page.url().split("/").at(-2) ?? "";
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await expect(page.getByText("Đã xuất bản 1 lần; mỗi lần là một phiên bản.")).toBeVisible();

  await page.goto("/teach/classes");
  await page.getByLabel("Tên lớp", { exact: true }).fill(CLASS_NAME);
  await page.getByLabel("Số học viên tối đa").fill("5");
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  state.classId = page.url().split("/").at(-1) ?? "";
  state.code = ((await page.locator(".join-code").textContent()) ?? "").replace("-", "");

  await page.goto(`/teach/classes/${state.classId}/assign`);
  await page.locator("#class-lesson").selectOption(state.lessonId);
  await page.getByRole("button", { name: "Lưu vào lớp", exact: true }).click();
  await expect(page.getByText("Đã cập nhật nội dung lớp.")).toBeVisible();
  await page.getByLabel("Tiêu đề", { exact: true }).fill(ASSIGNMENT_TITLE);
  await page
    .locator("label.choice-option")
    .filter({ hasText: PROMPT_PART })
    .getByRole("checkbox")
    .check();
  await page.getByRole("button", { name: "Xem lại trước khi giao", exact: true }).click();
  await page.getByRole("button", { name: "Giao bài cho lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}\?assigned=[0-9a-f-]{36}/);
  await page.context().close();
});

test("a learner who forgets a pattern looks it up, then a checked answer links the point", async ({
  page,
}) => {
  await createConfirmedStudent(learner.email, learner.password, learner.name);
  await signIn(page, learner.email, learner.password, `/join-class?code=${state.code}`);
  await page.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await page.waitForURL(`**/classes/${state.classId}`);

  // The class page and the assignment both offer the class's grammar.
  await expect(page.getByRole("link", { name: "Tra ngữ pháp các bài của lớp" })).toBeVisible();
  await page.getByRole("link", { name: ASSIGNMENT_TITLE, exact: true }).click();
  const lookup = page.getByRole("link", { name: "Tra ngữ pháp của lớp", exact: true });
  await expect(lookup).toHaveAttribute("href", `/grammar?class=${state.classId}`);
  await expect(lookup).toHaveAttribute("target", "_blank");

  const lookupPage = await page.context().newPage();
  const response = await lookupPage.goto(`/grammar?class=${state.classId}`);
  expect(response?.status()).toBe(200);
  await expect(
    lookupPage.getByRole("heading", { name: `Ngữ pháp của lớp ${CLASS_NAME}` }),
  ).toBeVisible();
  await expect(lookupPage.getByText("Tìm thấy 14 mẫu câu.")).toBeVisible();
  await lookupPage.getByLabel("Từ khóa").fill("càng");
  await expect(lookupPage.getByText("Tìm thấy 1 mẫu câu.")).toBeVisible();
  const deckLink = lookupPage.getByRole("link", { name: DECK_TITLE });
  await expect(deckLink).toHaveAttribute(
    "href",
    new RegExp(
      `^/lessons/${state.lessonId}\\?version=[0-9a-f-]{36}&class=${state.classId}#n4g-ba-hodo$`,
    ),
  );
  await lookupPage.close();

  await page.getByRole("button", { name: "Bắt đầu làm bài", exact: true }).click();
  await page.getByRole("radio", { name: "すれば", exact: true }).check();
  await page.getByRole("button", { name: "Kiểm tra câu này", exact: true }).click();
  await expect(page.getByText("Đúng rồi!")).toBeVisible();
  const review = page.getByRole("link", { name: /Ôn lại mẫu/ });
  await expect(review).toHaveAttribute("href", new RegExp(`#n4g-ba-form$`));

  await expect(page.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
  await page.waitForURL(/\/assignments\/[0-9a-f-]{36}\/results$/);
  const resultLink = page.locator(".result-row").getByRole("link", { name: /Ôn lại mẫu/ });
  await expect(resultLink).toHaveAttribute("href", new RegExp(`#n4g-ba-form$`));
  await resultLink.evaluate((link) => link.removeAttribute("target"));
  await resultLink.click();
  await expect(page.locator("#n4g-ba-form")).toBeInViewport();
});

test("a member of another class cannot read this class's grammar", async ({ browser }) => {
  const page = await teacherPage(browser);
  // The teacher owns the class but is not a member, as a stranger would not be either.
  const response = await page.goto(`/grammar?class=${state.classId}`);
  expect(response?.status()).toBe(404);
  await page.context().close();
});
