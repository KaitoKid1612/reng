import { createHmac } from "node:crypto";

import { expect, test } from "@playwright/test";

import rawLesson from "../content/lessons/lesson-01.json";
import { createJoinCode } from "../lib/join-code";
import { createUnsubscribeToken } from "../lib/notifications/unsubscribe";

import {
  adminClient,
  createConfirmedStudent,
  listEmails,
  readEmail,
  RUN_ID,
  signIn,
} from "./support";

import type { APIRequestContext } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const PASSWORD = `notify-${RUN_ID}`;
const teacher = { email: `notify-teacher-${RUN_ID}@example.test`, name: `Thầy ${RUN_ID} Phong` };
const learner = { email: `notify-a-${RUN_ID}@example.test`, name: `Đỗ ${RUN_ID} Châu` };
const quietLearner = { email: `notify-b-${RUN_ID}@example.test`, name: `Vũ ${RUN_ID} Yến` };
const CLASS_NAME = `Lớp nhắc bài ${RUN_ID}`;
const ASSIGNMENT_TITLE = `Luyện tối nay ${RUN_ID}`;
const state = { teacherId: "", learnerId: "", quietId: "", assignmentId: "" };

async function userIdByEmail(email: string) {
  const { data } = await adminClient().auth.admin.listUsers({ perPage: 1000 });
  const id = data.users.find((user) => user.email === email)?.id;
  if (!id) {
    throw new Error(`Missing ${email}`);
  }
  return id;
}

function runCron(request: APIRequestContext, job: string, secret = process.env.E2E_CRON_SECRET) {
  return request.get(`/api/cron/${job}`, { headers: { Authorization: `Bearer ${secret}` } });
}

test("learners opt in, a rerun sends nothing twice and one-click unsubscribe is honoured", async ({
  page,
  request,
}) => {
  const admin = adminClient();
  await createConfirmedStudent(teacher.email, PASSWORD, teacher.name);
  await createConfirmedStudent(learner.email, PASSWORD, learner.name);
  await createConfirmedStudent(quietLearner.email, PASSWORD, quietLearner.name);
  state.teacherId = await userIdByEmail(teacher.email);
  state.learnerId = await userIdByEmail(learner.email);
  state.quietId = await userIdByEmail(quietLearner.email);
  await admin.from("profiles").update({ role: "teacher" }).eq("id", state.teacherId);
  const lessonId = `notify-${RUN_ID}`;
  const { data: versionId } = await admin.rpc("publish_lesson", {
    p_lesson_id: lessonId,
    p_owner_id: state.teacherId,
    p_expected_revision: 0,
    p_title: rawLesson.title,
    p_title_ja: rawLesson.titleJa,
    p_summary: rawLesson.summary,
    p_order_no: 80,
    p_course_id: "n5",
    p_content: rawLesson.content,
    p_is_sample: true,
  });
  const code = createJoinCode((size) => Math.floor(Math.random() * size));
  const { data: classRow } = await admin
    .from("classes")
    .insert({ teacher_id: state.teacherId, name: CLASS_NAME, join_code: code })
    .select("id")
    .single();
  const classId: string = classRow?.id;
  for (const userId of [state.learnerId, state.quietId]) {
    await admin.rpc("join_class", { p_user_id: userId, p_code: code });
  }
  await admin.rpc("upsert_class_lesson", {
    p_teacher_id: state.teacherId,
    p_class_id: classId,
    p_lesson_id: lessonId,
    p_version_id: versionId,
    p_order_no: 1,
    p_available_at: new Date(Date.now() - 60_000).toISOString(),
  });
  const { data: assignmentId } = await admin.rpc("publish_assignment", {
    p_teacher_id: state.teacherId,
    p_class_id: classId,
    p_lesson_id: lessonId,
    p_title: ASSIGNMENT_TITLE,
    p_mode: "practice",
    p_due_at: new Date(Date.now() + 6 * 3_600_000).toISOString(),
    p_allow_late: false,
    p_pass_score: 70,
    p_max_attempts: 2,
    p_feedback_policy: "after_submit",
    p_practice_question_ids: ["q0101"],
    p_test_questions: null,
  });
  state.assignmentId = assignmentId;

  await signIn(page, learner.email, PASSWORD, "/settings/notifications");
  await page.getByLabel(/Chỉ khi bài tập sắp hết hạn/).check();
  await page.getByLabel("Tổng kết tuần vào tối Chủ nhật").check();
  await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect(page.getByText("Đã lưu cài đặt thông báo.")).toBeVisible();

  await admin.from("notification_preferences").upsert({
    user_id: state.quietId,
    reminder_frequency: "daily",
    consented_at: new Date().toISOString(),
  });
  const token = createUnsubscribeToken(state.quietId, process.env.E2E_EMAIL_LINK_SECRET ?? "");
  const oneClick = await request.post(`/api/unsubscribe/${token}`, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: "List-Unsubscribe=One-Click",
  });
  expect(oneClick.status()).toBe(200);

  expect((await runCron(request, "student-reminders", "wrong-secret")).status()).toBe(401);
  expect((await runCron(request, "student-reminders")).status()).toBe(200);
  expect((await runCron(request, "student-reminders")).status()).toBe(200);
  const messages = await listEmails(learner.email);
  expect(messages.map((message) => message.Subject)).toEqual([
    `Châu ơi, “${ASSIGNMENT_TITLE}” sắp đến hạn`,
  ]);
  expect(await listEmails(quietLearner.email)).toEqual([]);
  const email = await readEmail(messages[0].ID);
  expect(email.headers["List-Unsubscribe"]?.[0]).toContain("/api/unsubscribe/");
  expect(email.headers["List-Unsubscribe-Post"]?.[0]).toBe("List-Unsubscribe=One-Click");
  expect(email.Text).toContain("Hủy nhận email: http://127.0.0.1:3218/unsubscribe/");
});

test("the morning digest and weekly summary report real activity only", async ({
  page,
  request,
}) => {
  await signIn(page, learner.email, PASSWORD, `/assignments/${state.assignmentId}`);
  const origin = new URL(page.url()).origin;
  const start = await page.request.post(`/api/assignments/${state.assignmentId}/attempts`, {
    headers: { Origin: origin },
  });
  const { submissionId } = (await start.json()) as { submissionId: string };
  const submitted = await page.request.post(`/api/submissions/${submissionId}/submit`, {
    headers: { Origin: origin },
    data: { revision: 0, draft: { answers: { q0101: [1] }, checked: [] } },
  });
  expect(submitted.status()).toBe(200);

  const teacherPage = await (await page.context().browser()?.newContext())?.newPage();
  if (!teacherPage) {
    throw new Error("Unable to open a teacher page.");
  }
  await signIn(teacherPage, teacher.email, PASSWORD, "/settings/notifications");
  await teacherPage.getByLabel(/Tóm tắt lớp lúc 06:00/).check();
  await teacherPage.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect(teacherPage.getByText("Đã lưu cài đặt thông báo.")).toBeVisible();
  await teacherPage.context().close();

  expect((await runCron(request, "teacher-digest")).status()).toBe(200);
  const digests = await listEmails(teacher.email);
  expect(digests.map((message) => message.Subject)).toEqual([
    "Tóm tắt lớp sáng nay: 1 bài nộp mới, 1 học viên cần chú ý",
  ]);
  const digest = await readEmail(digests[0].ID);
  expect(digest.Text).toContain(CLASS_NAME);
  expect(digest.Text).toContain("Câu sai nhiều: わたしは がくせい___。 (1/1 học viên).");

  expect((await runCron(request, "weekly-summary")).status()).toBe(200);
  const weekly = (await listEmails(learner.email)).filter((message) =>
    message.Subject.includes("tuần này"),
  );
  expect(weekly.map((message) => message.Subject)).toEqual(["Châu ơi, tuần này bạn ôn 0 thẻ"]);
  expect((await readEmail(weekly[0].ID)).Text).toContain("Điểm trung bình tuần này: 0%.");
});

test("signed bounce events pause delivery and forged events are refused", async ({
  page,
  request,
}) => {
  const { data } = await adminClient()
    .from("email_log")
    .select("provider_message_id")
    .eq("user_id", state.learnerId)
    .eq("email_type", "daily_reminder")
    .single();
  const body = JSON.stringify({
    type: "email.bounced",
    data: { email_id: data?.provider_message_id },
  });
  expect((await request.post("/api/webhooks/email", { data: body })).status()).toBe(401);
  const secret = process.env.E2E_WEBHOOK_SECRET ?? "";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", Buffer.from(secret.slice("whsec_".length), "base64"))
    .update(`msg_${RUN_ID}.${timestamp}.${body}`)
    .digest("base64");
  const delivered = await request.post("/api/webhooks/email", {
    headers: {
      "Content-Type": "application/json",
      "svix-id": `msg_${RUN_ID}`,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
    },
    data: body,
  });
  expect(delivered.status()).toBe(200);
  await signIn(page, learner.email, PASSWORD, "/settings/notifications");
  await expect(page.getByRole("alert").filter({ hasText: "bị trả lại" })).toBeVisible();

  const email = await readEmail((await listEmails(learner.email)).at(-1)?.ID ?? "");
  const unsubscribeUrl = /Hủy nhận email: (\S+)/.exec(email.Text)?.[1] ?? "";
  await page.goto(unsubscribeUrl);
  await page.getByRole("button", { name: "Hủy nhận email", exact: true }).click();
  await expect(page.getByText("Đã tắt mọi email nhắc học từ Masu.")).toBeVisible();
  await page.goto("/settings/notifications");
  await expect(page.getByRole("radio", { name: "Không nhắc" })).toBeChecked();
  await expect(page.getByLabel("Tổng kết tuần vào tối Chủ nhật")).not.toBeChecked();
});
