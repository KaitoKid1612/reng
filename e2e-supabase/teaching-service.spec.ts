import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { adminClient, createConfirmedStudent, RUN_ID, signIn } from "./support";

import type { Browser } from "@playwright/test";

async function newAccount(browser: Browser, suffix: string, teacher: boolean) {
  const email = `service-${suffix}-${RUN_ID}@example.test`;
  const password = `service-pass-${RUN_ID}`;
  await createConfirmedStudent(email, password, `Dịch vụ ${suffix}`);
  const page = await (await browser.newContext()).newPage();
  await signIn(page, email, password, teacher ? "/teach/start" : "/classes");
  if (teacher) {
    await page.getByLabel(/Tôi chịu trách nhiệm/).check();
    await page.getByRole("button", { name: "Kích hoạt giảng dạy", exact: true }).click();
    await page.waitForURL("**/teach");
  }
  const { data } = await adminClient().auth.admin.listUsers({ perPage: 1000 });
  const id = data.users.find((user) => user.email === email)?.id;
  if (!id) {
    throw new Error("Missing fixture account.");
  }
  return { page, id };
}

test("teachers activate, learn in other classes and keep private lessons scoped to a pinned version", async ({
  browser,
}) => {
  const owner = await newAccount(browser, "owner", true);
  const learner = await newAccount(browser, "learner", true);
  const other = await newAccount(browser, "other", false);
  const visitor = await (await browser.newContext()).newPage();
  try {
    await owner.page.goto("/teach/classes");
    await owner.page.getByLabel("Tên lớp", { exact: true }).fill(`Dịch vụ riêng ${RUN_ID}`);
    await owner.page.getByLabel("Số học viên tối đa").fill("1");
    await owner.page.getByLabel("Link Google Meet").fill("https://meet.google.com/abc-defg-hij");
    await owner.page.getByRole("button", { name: "Tạo lớp", exact: true }).click();
    await owner.page.waitForURL(/\/teach\/classes\/[a-f0-9-]{36}$/);
    const classId = owner.page.url().split("/").at(-1) ?? "";
    const code = ((await owner.page.locator(".join-code").textContent()) ?? "").replace("-", "");
    const lessonId = `private-${RUN_ID}`;
    const draft = JSON.parse(await readFile("content/lessons/lesson-01.json", "utf8"));
    draft.content.slides[0].teacherNotes = `PRIVATE-NOTES-${RUN_ID}`;
    const publish = async (revision: number) => {
      const result = await adminClient().rpc("publish_lesson", {
        p_lesson_id: lessonId,
        p_owner_id: owner.id,
        p_expected_revision: revision,
        p_title: `Riêng ${RUN_ID}`,
        p_title_ja: draft.titleJa,
        p_summary: draft.summary,
        p_order_no: 1,
        p_course_id: "n5",
        p_content: draft.content,
      });
      if (result.error || typeof result.data !== "string") {
        throw new Error("Unable to publish a private lesson fixture.");
      }
      return result.data;
    };
    const firstVersion = await publish(0);
    const pinned = await adminClient().rpc("upsert_class_lesson", {
      p_teacher_id: owner.id,
      p_class_id: classId,
      p_lesson_id: lessonId,
      p_version_id: firstVersion,
      p_order_no: 1,
      p_available_at: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(pinned.error).toBeNull();
    await visitor.goto(`/lessons/${lessonId}`);
    await expect(
      visitor.getByRole("heading", { name: `Riêng ${RUN_ID}`, exact: true }),
    ).toHaveCount(0);
    const privateNotes = await visitor.request.get(`/api/lessons/${lessonId}/notes`);
    expect(privateNotes.status()).toBe(401);

    await Promise.all([learner.page.goto("/join-class"), other.page.goto("/join-class")]);
    await learner.page.getByLabel("Mã lớp", { exact: true }).fill(code);
    await other.page.getByLabel("Mã lớp", { exact: true }).fill(code);
    await Promise.all([
      learner.page.getByRole("button", { name: "Vào lớp", exact: true }).click(),
      other.page.getByRole("button", { name: "Vào lớp", exact: true }).click(),
    ]);
    await expect
      .poll(async () => {
        const { count } = await adminClient()
          .from("enrollments")
          .select("class_id", { count: "exact", head: true })
          .eq("class_id", classId)
          .is("left_at", null);
        return count;
      })
      .toBe(1);
    const { data: enrolled } = await adminClient()
      .from("enrollments")
      .select("user_id")
      .eq("class_id", classId)
      .is("left_at", null);
    const loser = enrolled?.[0]?.user_id === learner.id ? other.page : learner.page;
    await expect(loser.getByText(/Lớp đã đủ số học viên/)).toBeVisible();

    // Release the seat while retaining history, then confirm that the teacher can learn.
    const left = await adminClient()
      .from("enrollments")
      .update({ left_at: new Date().toISOString() })
      .eq("class_id", classId);
    expect(left.error).toBeNull();
    await learner.page.goto("/join-class");
    await learner.page.getByLabel("Mã lớp", { exact: true }).fill(code);
    await learner.page.getByRole("button", { name: "Vào lớp", exact: true }).click();
    await learner.page.waitForURL(`**/classes/${classId}`);
    await expect(learner.page.getByRole("link", { name: "Vào Google Meet" })).toHaveAttribute(
      "href",
      "https://meet.google.com/abc-defg-hij",
    );
    await learner.page.getByRole("link", { name: "Đọc bài", exact: true }).click();
    await expect(
      learner.page.getByRole("heading", { name: `Riêng ${RUN_ID}`, exact: true }),
    ).toBeVisible();
    expect(await learner.page.content()).not.toContain(`PRIVATE-NOTES-${RUN_ID}`);
    const secondVersion = await publish(1);
    await learner.page.goto(`/lessons/${lessonId}?version=${secondVersion}`);
    await expect(
      learner.page.getByRole("heading", { name: `Riêng ${RUN_ID}`, exact: true }),
    ).toHaveCount(0);
    await owner.page.goto(`/lessons/${lessonId}?version=${secondVersion}`);
    await expect(
      owner.page.getByRole("heading", { name: `Riêng ${RUN_ID}`, exact: true }),
    ).toBeVisible();
    await learner.page.goto(`/lessons/${lessonId}/slide?version=${firstVersion}`);
    await expect(learner.page.locator(".reveal")).toBeVisible();
    const outsiderFeedback = await visitor.request.get(
      `/api/lessons/${lessonId}/questions/${draft.content.questions[0].id}?version=${firstVersion}`,
    );
    expect(outsiderFeedback.status()).toBe(404);
  } finally {
    await Promise.all([
      owner.page.context().close(),
      learner.page.context().close(),
      other.page.context().close(),
      visitor.context().close(),
    ]);
  }
});
