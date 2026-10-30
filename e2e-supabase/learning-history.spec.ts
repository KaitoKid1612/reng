import { expect, test } from "@playwright/test";

import { importHistorySheets } from "../lib/history-sheet-import";

import { adminClient, createConfirmedStudent, RUN_ID, signIn, TEACHER } from "./support";

const archive = importHistorySheets(
  "viet",
  {
    rows: [
      ["Ngày", "Nội dung", "Tổng câu", "Đúng", "Sai", "Chưa làm", "Điểm %"],
      ["2026-10-20", "Ngày ôn kiểm thử", 1, 0, 1, 0, "0"],
    ],
  },
  {
    rows: [
      [
        "Ngày",
        "Bài",
        "Câu",
        "Dạng bài",
        "Câu hỏi",
        "Câu trả lời của học sinh",
        "Kết quả",
        "Chấm lúc",
      ],
      ["2026-10-20", "Bài thử", 1, "Điền", "Đề tự soạn không dùng dữ liệu thật", "a", "X", ""],
    ],
  },
);

test("teachers see own and pending learner history; learners gain only their own after teacher confirmation", async ({
  browser,
}) => {
  const admin = adminClient();
  const pendingEmail = `history-pending-${RUN_ID}@example.test`;
  const password = `history-${RUN_ID}-password`;
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const teacher = users.users.find((user) => user.email === TEACHER.email);
  expect(teacher).toBeTruthy();
  const self = await admin.rpc("import_learning_history", {
    p_source_key: `history-self-${RUN_ID}`,
    p_learner_id: teacher?.id,
    p_learner_email: TEACHER.email,
    p_teacher_id: teacher?.id,
    p_payload: archive,
  });
  expect(self.error).toBeNull();
  const pending = await admin.rpc("import_learning_history", {
    p_source_key: `history-pending-${RUN_ID}`,
    p_learner_id: null,
    p_learner_email: pendingEmail,
    p_teacher_id: teacher?.id,
    p_payload: { ...archive, learnerName: "Học viên chờ liên kết", course: "N5" },
  });
  expect(pending.error).toBeNull();
  const teacherContext = await browser.newContext();
  const teacherPage = await teacherContext.newPage();
  await signIn(teacherPage, TEACHER.email, TEACHER.password, "/history");
  await expect(
    teacherPage.getByRole("heading", { name: "Lịch sử học tập", exact: true }),
  ).toBeVisible();
  await teacherPage.goto(`/history/${pending.data}`);
  await teacherPage
    .getByRole("button", { name: "Xác nhận và liên kết học viên", exact: true })
    .click();
  await expect(teacherPage.getByRole("status").filter({ hasText: "cần đăng ký" })).toBeVisible();
  await createConfirmedStudent(pendingEmail, password, "Học viên lịch sử");
  const learnerContext = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const learnerPage = await learnerContext.newPage();
  await signIn(learnerPage, pendingEmail, password, "/history");
  await expect(
    learnerPage.getByText("Chưa có lịch sử Google Sheet", { exact: false }),
  ).toBeVisible();
  expect((await learnerPage.goto(`/history/${self.data}`))?.status()).toBe(404);
  expect((await learnerPage.goto(`/history/${pending.data}`))?.status()).toBe(404);
  await teacherPage
    .getByRole("button", { name: "Xác nhận và liên kết học viên", exact: true })
    .click();
  await expect(teacherPage.locator('input[name="archiveId"]')).toHaveCount(0);
  await learnerPage.goto("/history");
  await expect(
    learnerPage.getByRole("link", { name: "Học viên chờ liên kết — N5", exact: true }),
  ).toBeVisible();
  await learnerPage.getByRole("link", { name: "Xem lịch sử", exact: true }).click();
  await expect(learnerPage.getByText("Điểm gốc: 0 / 100", { exact: true })).toBeVisible();
  await expect(
    learnerPage.getByRole("button", { name: "Xác nhận và liên kết học viên", exact: true }),
  ).toHaveCount(0);
  await learnerPage.locator("summary").click();
  await expect(
    learnerPage.getByText("Đề bài: Đề tự soạn không dùng dữ liệu thật", { exact: true }),
  ).toBeVisible();
  expect(
    await learnerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  expect((await learnerPage.goto(`/history/${self.data}`))?.status()).toBe(404);
  await teacherContext.close();
  await learnerContext.close();
});
