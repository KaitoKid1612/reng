import { expect, test } from "@playwright/test";

import { adminClient, becomeTeacher, createConfirmedStudent, RUN_ID, signIn } from "./support";

import type { Browser, Page } from "@playwright/test";

const PROMPT = `Viết “cảm ơn” lịch sự ${RUN_ID}.`;

async function newAccount(browser: Browser, suffix: string, teacher: boolean) {
  const email = `variant-${suffix}-${RUN_ID}@example.test`;
  const password = `variant-pass-${RUN_ID}`;
  await createConfirmedStudent(email, password, `Đáp án ${suffix}`);
  const page = await (await browser.newContext()).newPage();
  await signIn(page, email, password, teacher ? "/teach/start" : "/classes");
  if (teacher) {
    await becomeTeacher(page, email);
  }
  const { data } = await adminClient().auth.admin.listUsers({ perPage: 1000 });
  const id = data.users.find((user) => user.email === email)?.id ?? "";
  return { page, id };
}

async function answerPractice(page: Page, code: string, classId: string, answer: string) {
  await page.goto("/join-class");
  await page.getByLabel("Mã lớp", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await page.waitForURL(`**/classes/${classId}`);
  await page.getByRole("link", { name: `Luyện cảm ơn ${RUN_ID}`, exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu làm bài", exact: true }).click();
  await page.getByLabel(PROMPT).fill(answer);
  await expect(page.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
  await page.waitForURL(/\/results\?outcome=wrong$/);
  await expect(page.locator(".result-score")).toContainText("0%");
  return page.url().replace(/\?outcome=wrong$/, "");
}

test("a teacher accepts an equivalent answer and every matching learner gets the points", async ({
  browser,
}) => {
  const owner = await newAccount(browser, "owner", true);
  const anna = await newAccount(browser, "anna", false);
  const binh = await newAccount(browser, "binh", false);
  try {
    await owner.page.goto("/teach/classes");
    await owner.page.getByLabel("Tên lớp", { exact: true }).fill(`Lớp đáp án ${RUN_ID}`);
    await owner.page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
    await owner.page.waitForURL(/\/teach\/classes\/[a-f0-9-]{36}$/);
    const classId = owner.page.url().split("/").at(-1) ?? "";
    const code = ((await owner.page.locator(".join-code").textContent()) ?? "").replace("-", "");
    const lessonId = `variant-${RUN_ID}`;
    const published = await adminClient().rpc("publish_lesson", {
      p_lesson_id: lessonId,
      p_owner_id: owner.id,
      p_expected_revision: 0,
      p_title: `Cảm ơn ${RUN_ID}`,
      p_title_ja: "ありがとう",
      p_summary: "Cảm ơn lịch sự.",
      p_order_no: 1,
      p_course_id: "n5",
      p_content: {
        schemaVersion: 1,
        vocab: [],
        grammar: [],
        slides: [{ id: "intro", type: "title", jp: "ありがとう", vi: "Cảm ơn" }],
        questions: [
          {
            id: "q-thanks",
            type: "fill",
            prompt: PROMPT,
            inputMode: "hiragana",
            kanjiStrict: false,
            answer: ["ありがとうございます"],
            explain: "Cách nói cảm ơn lịch sự.",
            points: 1,
            tags: [],
          },
        ],
      },
    });
    expect(published.error).toBeNull();
    const pinned = await adminClient().rpc("upsert_class_lesson", {
      p_teacher_id: owner.id,
      p_class_id: classId,
      p_lesson_id: lessonId,
      p_version_id: published.data,
      p_order_no: 1,
      p_available_at: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(pinned.error).toBeNull();
    const publishPractice = (title: string) =>
      adminClient().rpc("publish_assignment", {
        p_teacher_id: owner.id,
        p_class_id: classId,
        p_lesson_id: lessonId,
        p_title: title,
        p_mode: "practice",
        p_due_at: null,
        p_allow_late: true,
        p_pass_score: 70,
        p_max_attempts: 3,
        p_feedback_policy: "after_submit",
        p_practice_question_ids: ["q-thanks"],
        p_test_questions: null,
      });
    expect((await publishPractice(`Luyện cảm ơn ${RUN_ID}`)).error).toBeNull();

    await answerPractice(anna.page, code, classId, "ありがとう");
    const binhResults = await answerPractice(binh.page, code, classId, "ありがとう。");

    await owner.page.goto(`/teach/classes/${classId}/students/${anna.id}`);
    await owner.page
      .getByRole("button", { name: "Chấp nhận câu trả lời của câu 1", exact: true })
      .click();
    await expect(owner.page.locator(".accept-notice")).toContainText(
      "Đã chấp nhận “ありがとう”: 2 bài làm được cộng điểm.",
    );
    await expect(owner.page.locator(".result-row .status-badge")).toHaveText("Đúng");
    await owner.page.screenshot({ path: "test-results/answer-variants-teacher.png" });
    await expect(
      owner.page.getByRole("button", { name: "Chấp nhận câu trả lời của câu 1" }),
    ).toHaveCount(0);

    // Bình wrote it with a final period; the same grading rules count it too.
    await binh.page.goto(binhResults);
    await expect(binh.page.locator(".result-score")).toContainText("100%");

    // Practice given later from the lesson already accepts the answer.
    const next = await publishPractice(`Luyện lại ${RUN_ID}`);
    const { data: item } = await adminClient()
      .from("assignment_items")
      .select("question_snapshot")
      .eq("assignment_id", next.data)
      .single();
    expect(item?.question_snapshot.answer).toEqual(["ありがとうございます", "ありがとう"]);
  } finally {
    await Promise.all([owner, anna, binh].map((account) => account.page.context().close()));
  }
});
