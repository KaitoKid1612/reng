import { expect, test } from "@playwright/test";

import { toVietnamInput } from "../lib/vietnam-time";

import {
  adminClient,
  becomeTeacher,
  createConfirmedStudent,
  RUN_ID,
  signIn,
  TEACHER,
} from "./support";

import type { Browser, Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const LESSON_ID = `order-${RUN_ID}`;
const ORDER_PROMPT = "Sắp xếp các mảnh thành câu đúng.";
const PASSAGE = "たなかさんは まいあさ パンを たべます。それから コーヒーを のみます。";
const FIRST_READING = "たなかさんは あさ なにを たべますか。";
const SECOND_READING = "たなかさんは あさ なにを のみますか。";
const TEST_PASSAGE = "わたしは マイクです。アメリカから きました。";
const TEST_ORDER_PROMPT = "Sắp xếp thành câu giới thiệu đúng với đoạn văn.";
const learner = {
  email: `order-learner-${RUN_ID}@example.test`,
  password: `order-pass-${RUN_ID}`,
  name: `Học viên sắp xếp ${RUN_ID}`,
};
const state = { classId: "", code: "", practiceTitle: "", testTitle: "" };

async function openSection(page: Page, name: RegExp) {
  const summary = page.locator("summary").filter({ hasText: name });
  if ((await summary.locator("..").getAttribute("open")) === null) {
    await summary.click();
  }
}

async function publishAssignment(page: Page) {
  await page.getByRole("button", { name: "Xem lại và xuất bản", exact: true }).click();
  await page.getByRole("button", { name: "Xuất bản bài giao", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
}

async function placePieces(page: Page, prompt: string, pieces: readonly string[]) {
  const card = page.locator(".question-card").filter({ hasText: prompt });
  const bank = card.getByRole("group", { name: "Các mảnh còn lại" });
  for (const piece of pieces) {
    await bank.getByRole("button", { name: piece, exact: true }).click();
  }
  await expect(card.getByRole("group", { name: /Câu đang xếp/ })).toContainText(pieces.join(""));
  return card;
}

test("a Japanese teacher writes sentence-order and reading questions and a learner is graded on them", async ({
  page,
  browser,
}) => {
  await signIn(page, TEACHER.email, TEACHER.password, "/teach");
  await page.getByRole("link", { name: "Tạo bài mới", exact: true }).click();
  await page.getByLabel("Mã bài", { exact: true }).fill(LESSON_ID);
  await page.getByLabel("Thứ tự trong khóa", { exact: true }).fill("92");
  await page.getByLabel("Tiêu đề tiếng Việt", { exact: true }).fill(`Đọc hiểu ${RUN_ID}`);
  await page.getByRole("button", { name: "Tạo và mở editor", exact: true }).click();
  await page.waitForURL(`**/teach/lessons/${LESSON_ID}/edit`);
  await page.getByLabel("Tiêu đề tiếng Nhật", { exact: true }).fill("どっかい");
  await page.getByLabel("Tóm tắt", { exact: true }).fill("Đọc đoạn văn ngắn và sắp xếp câu.");
  await page.getByLabel("Loại slide mới").selectOption({ label: "Tiêu đề" });
  await page.getByRole("button", { name: "Thêm slide", exact: true }).click();
  await page.getByLabel("Dòng tiếng Nhật", { exact: true }).fill("どっかい");
  await page.getByLabel("Dòng tiếng Việt", { exact: true }).fill(`Đọc hiểu ${RUN_ID}`);

  await openSection(page, /^Câu luyện/);
  await page.getByRole("button", { name: "Thêm câu sắp xếp", exact: true }).click();
  const order = page.getByRole("group", { name: "Câu 1: sắp xếp câu" });
  await order.getByLabel("Đề bài", { exact: true }).fill(ORDER_PROMPT);
  await order.getByLabel(/Các mảnh theo đúng thứ tự câu/).fill("わたしは\nがくせい\nです");
  await expect(order.getByText("Câu đúng:")).toContainText("わたしはがくせいです");
  await order.getByLabel("Giải thích đáp án", { exact: true }).fill("わたしは がくせいです.");

  await page.getByRole("button", { name: "Thêm câu trắc nghiệm", exact: true }).click();
  const reading = page.getByRole("group", { name: "Câu 2: trắc nghiệm" });
  await reading.getByRole("button", { name: "Thêm đoạn văn đọc hiểu", exact: true }).click();
  await reading.getByLabel("Đoạn văn đọc hiểu", { exact: true }).fill(PASSAGE);
  await reading.getByLabel("Đề bài", { exact: true }).fill(FIRST_READING);
  await reading.getByLabel("Nội dung lựa chọn 1").fill("パン");
  await reading.getByLabel("Nội dung lựa chọn 2").fill("ごはん");
  await reading.getByLabel("Lựa chọn 1 là đáp án đúng").check();
  await reading.getByLabel("Giải thích đáp án", { exact: true }).fill("まいあさ パンを たべます.");
  await reading.getByRole("button", { name: "Thêm câu hỏi cho đoạn văn này", exact: true }).click();
  const second = page.getByRole("group", { name: "Câu 3: trắc nghiệm" });
  await expect(second.getByLabel("Đoạn văn đọc hiểu", { exact: true })).toHaveValue(PASSAGE);
  await second.getByLabel("Đề bài", { exact: true }).fill(SECOND_READING);
  await second.getByLabel("Nội dung lựa chọn 1").fill("おちゃ");
  await second.getByLabel("Nội dung lựa chọn 2").fill("コーヒー");
  await second.getByLabel("Lựa chọn 2 là đáp án đúng").check();
  await second.getByLabel("Giải thích đáp án", { exact: true }).fill("コーヒーを のみます.");
  await order.screenshot({ path: "test-results/question-authoring-order-editor.png" });
  await reading.screenshot({ path: "test-results/question-authoring-reading-editor.png" });

  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText("Đã lưu nháp lúc");
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText("Đã xuất bản phiên bản mới");
  // Reloading shows what was saved: the shared passage and the pieces in sentence order.
  await page.reload();
  await openSection(page, /^Câu luyện/);
  await expect(
    page.getByRole("group", { name: "Câu 3: trắc nghiệm" }).getByLabel("Đoạn văn đọc hiểu"),
  ).toHaveValue(PASSAGE);
  await expect(
    page.getByRole("group", { name: "Câu 1: sắp xếp câu" }).getByLabel(/Các mảnh/),
  ).toHaveValue("わたしは\nがくせい\nです");

  await page.goto("/teach/classes");
  await page.getByLabel("Tên lớp", { exact: true }).fill(`Lớp đọc hiểu ${RUN_ID}`);
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  state.classId = page.url().split("/").at(-1) ?? "";
  state.code = ((await page.locator(".join-code").textContent()) ?? "").replace("-", "");
  await page.goto(`/teach/classes/${state.classId}/assign`);
  await page.locator("#class-lesson").selectOption(LESSON_ID);
  await page.getByRole("button", { name: "Lưu vào lớp", exact: true }).click();
  await expect(page.getByText("Đã cập nhật nội dung lớp.")).toBeVisible();
  state.practiceTitle = `Luyện đọc hiểu ${RUN_ID}`;
  await page.getByLabel("Tiêu đề", { exact: true }).fill(state.practiceTitle);
  for (const prompt of [ORDER_PROMPT, FIRST_READING, SECOND_READING]) {
    await page.getByRole("checkbox", { name: new RegExp(prompt) }).check();
  }
  await publishAssignment(page);

  await page.goto(`/teach/classes/${state.classId}/assign`);
  state.testTitle = `Kiểm tra sắp xếp ${RUN_ID}`;
  await page.getByLabel("Tiêu đề", { exact: true }).fill(state.testTitle);
  await page.getByRole("radio", { name: "Kiểm tra", exact: true }).check();
  await page
    .getByLabel("Hạn nộp (giờ Việt Nam)")
    .fill(toVietnamInput(new Date(Date.now() + 86_400_000).toISOString()));
  await page.getByRole("button", { name: "Thêm câu sắp xếp", exact: true }).click();
  const testOrder = page.getByRole("group", { name: "Câu 1: sắp xếp câu" });
  await testOrder.getByRole("button", { name: "Thêm đoạn văn đọc hiểu", exact: true }).click();
  await testOrder.getByLabel("Đoạn văn đọc hiểu", { exact: true }).fill(TEST_PASSAGE);
  await testOrder.getByLabel("Đề bài", { exact: true }).fill(TEST_ORDER_PROMPT);
  await testOrder.getByLabel(/Các mảnh theo đúng thứ tự câu/).fill("わたしは\nマイク\nです\n");
  await testOrder.getByLabel("Giải thích đáp án", { exact: true }).fill("わたしは マイクです.");
  await publishAssignment(page);

  await createConfirmedStudent(learner.email, learner.password, learner.name);
  // Learners answer on their phones.
  const student = await (
    await browser.newContext({ viewport: { width: 390, height: 844 } })
  ).newPage();
  try {
    await signIn(student, learner.email, learner.password, "/join-class");
    await student.getByLabel("Mã lớp", { exact: true }).fill(state.code);
    await student.getByRole("button", { name: "Vào lớp", exact: true }).click();
    await student.waitForURL(`**/classes/${state.classId}`);
    // The lesson has questions but no words: no empty flashcard or kanji practice to open.
    await expect(student.getByRole("link", { name: "Đọc bài", exact: true })).toBeVisible();
    await expect(student.getByRole("link", { name: "Flashcard", exact: true })).toHaveCount(0);
    await expect(student.getByRole("link", { name: "Luyện kanji", exact: true })).toHaveCount(0);
    await student.getByRole("link", { name: "Đọc bài", exact: true }).click();
    await expect(student.getByRole("link", { name: "Flashcard từ vựng" })).toHaveCount(0);
    await student.goto(`/classes/${state.classId}`);
    await student.getByRole("link", { name: state.practiceTitle, exact: true }).click();
    await student.getByRole("button", { name: "Bắt đầu làm bài", exact: true }).click();
    await expect(student.locator(".question-passage").filter({ hasText: PASSAGE })).toHaveCount(2);
    const orderCard = await placePieces(student, ORDER_PROMPT, ["わたしは", "がくせい", "です"]);
    await expect(student.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
    await orderCard.getByRole("button", { name: "Kiểm tra câu này", exact: true }).click();
    await expect(orderCard.getByText("Đúng rồi!")).toBeVisible();
    await student.screenshot({
      path: "test-results/question-authoring-learner-390.png",
      fullPage: true,
    });
    expect(
      await student.evaluate(() => document.documentElement.scrollWidth),
      "no sideways scrolling on a phone",
    ).toBeLessThanOrEqual(390);
    // A phone shows one question at a time; both reading questions show the passage.
    await student.getByRole("button", { name: "Câu sau", exact: true }).click();
    const firstReading = student.locator(".question-card").filter({ hasText: FIRST_READING });
    await expect(firstReading.locator(".question-passage")).toHaveText(PASSAGE);
    await firstReading.getByRole("radio", { name: "パン", exact: true }).check();
    await student.getByRole("button", { name: "Câu sau", exact: true }).click();
    const secondReading = student.locator(".question-card").filter({ hasText: SECOND_READING });
    await expect(secondReading.locator(".question-passage")).toHaveText(PASSAGE);
    await secondReading.getByRole("radio", { name: "コーヒー", exact: true }).check();
    await expect(student.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
    await student.getByRole("button", { name: "Nộp bài", exact: true }).click();
    await student.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
    await student.waitForURL(/\/results$/);
    await expect(student.locator(".result-score")).toContainText("100%");

    await student.goto(`/classes/${state.classId}`);
    await student.getByRole("link", { name: state.testTitle, exact: true }).click();
    await student.getByRole("button", { name: "Bắt đầu làm bài", exact: true }).click();
    await expect(student.locator(".question-passage")).toHaveText(TEST_PASSAGE);
    await placePieces(student, TEST_ORDER_PROMPT, ["わたしは", "マイク", "です"]);
    await expect(student.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
    await student.getByRole("button", { name: "Nộp bài", exact: true }).click();
    await student.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
    await student.waitForURL(/\/results$/);
    // Test results stay hidden until the due time, so the stored grade is read directly.
    const { data: tests } = await adminClient()
      .from("assignments")
      .select("id")
      .eq("class_id", state.classId)
      .eq("title", state.testTitle);
    const { data: submissions } = await adminClient()
      .from("submissions")
      .select("id")
      .eq("assignment_id", tests?.[0]?.id ?? "")
      .eq("status", "submitted");
    const { data: answers } = await adminClient()
      .from("answers")
      .select("is_correct")
      .eq("submission_id", submissions?.[0]?.id ?? "");
    expect(answers).toEqual([{ is_correct: true }]);
  } finally {
    await student.context().close();
  }
});

async function newTeacher(browser: Browser) {
  const email = `order-teacher-${RUN_ID}@example.test`;
  const password = `order-teacher-pass-${RUN_ID}`;
  await createConfirmedStudent(email, password, `Giáo viên sắp xếp ${RUN_ID}`);
  const page = await (await browser.newContext()).newPage();
  await signIn(page, email, password, "/teach/start");
  await becomeTeacher(page, email);
  return page;
}

test("a Chinese teacher confirms a sentence-order question again after editing a piece, and the slide shows it", async ({
  browser,
}) => {
  const page = await newTeacher(browser);
  try {
    await page.goto("/teach/lessons/new");
    await page.getByRole("radio", { name: /Dạy từ mới/ }).check();
    await page.getByLabel("Tên bài", { exact: true }).fill(`Sắp xếp câu ${RUN_ID}`);
    await page.getByLabel("Mục tiêu nhỏ đầu tiên", { exact: true }).fill("Giới thiệu bản thân");
    await page.getByRole("button", { name: "Tạo bài và bắt đầu soạn", exact: true }).click();
    await page.waitForURL(/\/teach\/lessons\/lesson-[a-f0-9]{32}\/edit$/);

    await page.getByRole("button", { name: "4. Câu luyện", exact: true }).click();
    await page.getByRole("button", { name: "Thêm câu sắp xếp", exact: true }).click();
    await page.getByRole("button", { name: "Thêm đoạn văn cho câu 1", exact: true }).click();
    await page.getByLabel("Đoạn văn đọc hiểu của câu 1").fill("小明：你好！我是学生。");
    await page.getByLabel("Đề bài câu 1", { exact: true }).fill("Sắp xếp thành câu của 小明.");
    const pieces = page.getByLabel(/Các mảnh của câu 1/);
    await pieces.fill("我\n是\n老师");
    await expect(page.getByText("Câu đúng:")).toContainText("我是老师");
    await page.getByLabel("Giải thích câu 1", { exact: true }).fill("我是学生: tôi là học sinh.");
    await page.getByRole("button", { name: "Lưu và xác nhận đáp án câu 1", exact: true }).click();
    await expect(page.getByText("Đã xác nhận đáp án", { exact: true })).toBeVisible();
    // Changing only the text of a piece is a new answer that needs a new review.
    await pieces.fill("我\n是\n学生");
    await expect(page.getByText("Chưa xác nhận đáp án", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Lưu và xác nhận đáp án câu 1", exact: true }).click();
    await expect(page.getByText("Đã xác nhận đáp án", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "5. Slide & xuất bản", exact: true }).click();
    await page.getByRole("button", { name: "Dựng slide từ nội dung", exact: true }).click();
    await page.getByRole("button", { name: "Áp dụng thay đổi slide", exact: true }).click();
    // Title, goals, the question, then homework.
    await expect(page.locator(".slide-list-item").nth(2)).toContainText("Câu luyện");
    await page.getByRole("button", { name: "Chọn slide 3", exact: true }).click();
    const preview = page.locator(".slide-preview");
    await expect(preview.locator(".slide-passage")).toHaveText("小明：你好！我是学生。");
    const shown = await preview
      .getByRole("list", { name: "Các mảnh cần sắp xếp" })
      .getByRole("listitem")
      .allTextContents();
    expect([...shown].sort()).toEqual(["学生", "我", "是"].sort());
    expect(shown).not.toEqual(["我", "是", "学生"]);
    await page.getByRole("button", { name: "Lưu và xuất bản", exact: true }).click();
    await expect(page.locator(".editor-status")).toContainText("Đã xuất bản phiên bản mới");

    await page.getByRole("link", { name: "Xem bản đã xuất bản" }).click();
    const slideHref =
      (await page.getByRole("link", { name: "Trình chiếu", exact: true }).getAttribute("href")) ??
      "";
    await page.goto(`${slideHref.replace(/#.*$/, "")}#3`);
    await expect(page.getByTestId("slide-counter")).toHaveText("3 / 4");
    await page.getByRole("button", { name: "Hiện đáp án", exact: true }).click();
    await expect(page.locator(".quiz-feedback")).toContainText("我是学生");
    await page.screenshot({ path: "test-results/question-authoring-slide.png" });
  } finally {
    await page.context().close();
  }
});
