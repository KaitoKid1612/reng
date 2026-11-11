import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { adminClient, createConfirmedStudent, RUN_ID, signIn, TEACHER } from "./support";

const BANK_ID = `jlpt-n5-${RUN_ID}`;
const BANK_TITLE = `Ngân hàng N5 thi thử ${RUN_ID}`;
const learner = {
  email: `jlpt-learner-${RUN_ID}@example.test`,
  password: `pass-jlpt-${RUN_ID}`,
  name: `Lê Thu Hà ${RUN_ID}`,
};

// The repo's N5 review bank (vocabulary, grammar and listening questions with audio) becomes a
// lesson of the E2E teacher, published through the same database function as the editor.
async function publishBank() {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    throw error;
  }
  const teacherId = data.users.find((user) => user.email === TEACHER.email)?.id;
  if (!teacherId) {
    throw new Error("The E2E teacher is missing.");
  }
  const bank = JSON.parse(
    await readFile("content/review-banks/n5-daily-with-listening.json", "utf8"),
  );
  const published = await admin.rpc("publish_lesson", {
    p_lesson_id: BANK_ID,
    p_owner_id: teacherId,
    p_expected_revision: 0,
    p_title: BANK_TITLE,
    p_title_ja: "N5",
    p_summary: "Ngân hàng ôn N5",
    p_order_no: 950,
    p_course_id: "n5",
    p_content: bank.content,
  });
  if (published.error) {
    throw published.error;
  }
}

test("a teacher gives a timed N5 mock exam and a learner sees section results", async ({
  page,
  browser,
}) => {
  await publishBank();
  await signIn(page, TEACHER.email, TEACHER.password, "/teach/classes");
  await page.getByLabel("Tên lớp", { exact: true }).fill(`Luyện thi N5 ${RUN_ID}`);
  await page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  const classId = page.url().split("/").at(-1) ?? "";
  const code = ((await page.locator(".join-code").textContent()) ?? "").replace("-", "");

  await page.goto(`/teach/classes/${classId}/assign`);
  await page.locator("#class-lesson").selectOption(BANK_ID);
  await page.getByRole("button", { name: "Lưu vào lớp", exact: true }).click();
  await expect(page.getByText("Đã cập nhật nội dung lớp.")).toBeVisible();
  await page.getByRole("link", { name: "Tạo đề thi thử JLPT" }).click();
  const exam = page.locator("section", {
    has: page.getByRole("heading", { name: "Thi thử JLPT", exact: true }),
  });
  await expect(exam.getByRole("status")).toContainText(
    "Đề gồm 25 câu chữ Hán – từ vựng, 20 câu ngữ pháp – đọc hiểu, 20 câu nghe hiểu: 65 câu",
  );
  await expect(exam.getByLabel("Thời gian làm bài (phút)")).toHaveValue("90");
  await exam.getByLabel("N4", { exact: true }).check();
  await expect(exam.getByLabel("Thời gian làm bài (phút)")).toHaveValue("115");
  await exam.getByLabel("N5", { exact: true }).check();
  await exam.getByRole("button", { name: "Giao đề thi thử", exact: true }).click();
  await page.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}\?assigned=[0-9a-f-]{36}/);
  const examId = new URL(page.url()).searchParams.get("assigned") ?? "";
  await expect(page.getByText("Thi thử JLPT N5 (90 phút)").first()).toBeVisible();

  await createConfirmedStudent(learner.email, learner.password, learner.name);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const learnerPage = await context.newPage();
  await signIn(learnerPage, learner.email, learner.password);
  await learnerPage.goto("/join-class");
  await learnerPage.getByLabel("Mã lớp", { exact: true }).fill(code);
  await learnerPage.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await learnerPage.waitForURL(`**/classes/${classId}`);

  await learnerPage.goto(`/assignments/${examId}`);
  // "Còn … ngày tới kỳ thi JLPT, Chủ nhật …" (or "Hôm nay là ngày thi JLPT, Chủ nhật …").
  await expect(learnerPage.locator(".assignment-facts")).toContainText("thi JLPT, Chủ nhật");
  await expect(
    learnerPage.getByText(/Đồng hồ 90 phút bắt đầu ngay khi bạn bấm Bắt đầu thi/),
  ).toBeVisible();
  await expect(learnerPage.getByText(/mỗi câu nghe chỉ phát một lần/)).toBeVisible();
  await learnerPage.getByRole("button", { name: "Bắt đầu thi", exact: true }).click();
  await expect(learnerPage.getByRole("timer")).toContainText(/Thời gian còn lại 1:(30|29):\d\d/);
  // The real test's split of 90 minutes for N5: 20, 40 and 30.
  await expect(learnerPage.locator(".exam-pacing")).toContainText(
    /Giờ đề thật: phần 1\/3, Chữ Hán – từ vựng \(câu 1–25\), còn (20:00|19:\d\d)/,
  );
  // Like the real test, each clip plays once straight through: no pause, rewind or slow speed.
  const players = learnerPage.locator(".listening-player");
  await expect(players).toHaveCount(20);
  await expect(players.first().getByTestId("listen-count")).toHaveText("Đã nghe 0 lần / tối đa 1");
  await expect(
    learnerPage.locator(".listening-player button", { hasText: /Lùi 5 giây|Chậm 0,75x/ }),
  ).toHaveCount(0);
  const choice = learnerPage.locator("label.choice-option:visible");
  if (await choice.count()) {
    await choice.first().click();
  } else {
    await learnerPage.locator('input[type="text"]:visible').first().fill("がっこう");
  }
  await expect(learnerPage.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
  await learnerPage.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await learnerPage.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
  await learnerPage.waitForURL(/\/results/);
  const results = learnerPage.locator("section", {
    has: learnerPage.getByRole("heading", { name: "Kết quả theo phần thi JLPT N5" }),
  });
  for (const section of [
    "Chữ Hán – từ vựng (文字・語彙)",
    "Ngữ pháp – đọc hiểu (文法・読解)",
    "Nghe hiểu (聴解)",
  ]) {
    await expect(results.getByRole("rowheader", { name: section })).toBeVisible();
  }
  await expect(results).toContainText("/ 180 điểm (ước tính)");
  await expect(results).toContainText("Đỗ N5 cần tổng từ 80/180");
  const total = ((await results.locator(".result-score").textContent()) ?? "").split("/")[0];
  // The single attempt is used: the exam page offers the results, not a new attempt.
  await learnerPage.goto(`/assignments/${examId}`);
  await expect(learnerPage.getByRole("button", { name: "Bắt đầu thi" })).toHaveCount(0);
  await expect(learnerPage.getByText("Bạn đã dùng hết số lượt làm bài.")).toBeVisible();

  // Progress and the teacher's learner page list the exam with the result page's estimate.
  const historyOf = (target: typeof page) =>
    target.locator("section", {
      has: target.getByRole("heading", { name: "Thi thử JLPT", exact: true }),
    });
  await learnerPage.goto("/progress");
  const learnerRow = historyOf(learnerPage).locator("tbody tr");
  await expect(learnerRow).toHaveCount(1);
  await expect(learnerRow.locator('[data-label="Tổng"]')).toHaveText(`${total.trim()}/180`);
  await expect(learnerRow.locator('[data-label="Kết quả"]')).toContainText("Chưa đỗ");
  await learnerRow.getByRole("link").click();
  await learnerPage.waitForURL(`**/assignments/${examId}/results`);
  await context.close();

  await page.goto(`/teach/classes/${classId}`);
  await page
    .getByRole("row", { name: new RegExp(learner.name) })
    .getByRole("link", { name: learner.name })
    .click();
  await expect(historyOf(page).locator('tbody [data-label="Tổng"]')).toHaveText(
    `${total.trim()}/180`,
  );
});
