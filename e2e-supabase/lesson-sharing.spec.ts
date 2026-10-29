import { expect, test } from "@playwright/test";

import { adminClient, becomeTeacher, createConfirmedStudent, RUN_ID, signIn } from "./support";

import type { Browser } from "@playwright/test";

const LESSON_TITLE = `Bài chia sẻ ${RUN_ID}`;
const OWNER_NAME = `Cô Lan ${RUN_ID}`;
const SECRET_NOTE = `SHARE-NOTE-${RUN_ID}`;

const CONTENT = {
  schemaVersion: 2,
  context: {
    subject: "chinese",
    languageTag: "zh-Hans",
    instructionLanguageTag: "vi-VN",
    locale: "zh-CN",
  },
  objectives: ["Chào hỏi"],
  vocab: [
    {
      id: "vocab-1",
      text: "你好",
      reading: "nǐ hǎo",
      meaning: "xin chào",
      examples: [],
      audio: null,
    },
  ],
  grammar: [],
  dialogue: [],
  questions: [],
  slides: [
    { id: "g-title", type: "title", text: LESSON_TITLE, teacherNotes: SECRET_NOTE },
    { id: "g-vocab-vocab-1", type: "vocab", refs: ["vocab-1"] },
  ],
};

async function newTeacher(browser: Browser, suffix: string, fullName: string) {
  const email = `sharing-${suffix}-${RUN_ID}@example.test`;
  const password = `sharing-pass-${RUN_ID}`;
  await createConfirmedStudent(email, password, fullName);
  const page = await (await browser.newContext()).newPage();
  await signIn(page, email, password, "/teach/start");
  await becomeTeacher(page, email);
  const { data } = await adminClient().auth.admin.listUsers({ perPage: 1000 });
  const id = data.users.find((user) => user.email === email)?.id;
  if (!id) {
    throw new Error("Missing fixture account.");
  }
  return { page, id, email };
}

async function publishFixture(ownerId: string) {
  const authoring = {
    templateId: "starter",
    templateVersion: 1,
    audience: "",
    prerequisites: "",
    difficulty: "beginner",
    step: 0,
    generatedSlides: {},
  };
  const created = await adminClient().rpc("create_teaching_lesson", {
    p_teacher_id: ownerId,
    p_request_id: crypto.randomUUID(),
    p_title: LESSON_TITLE,
    p_order: 1,
    p_content: CONTENT,
    p_authoring: authoring,
  });
  if (created.error || typeof created.data !== "string") {
    throw new Error("Unable to create the shared lesson fixture.");
  }
  const published = await adminClient().rpc("publish_lesson", {
    p_lesson_id: created.data,
    p_owner_id: ownerId,
    p_expected_revision: 0,
    p_title: LESSON_TITLE,
    p_title_ja: "",
    p_summary: "Chào hỏi",
    p_order_no: 1,
    p_course_id: "chinese",
    p_content: CONTENT,
  });
  if (published.error || typeof published.data !== "string") {
    throw new Error("Unable to publish the shared lesson fixture.");
  }
  return { lessonId: created.data, versionId: published.data };
}

test("teachers share one version, copy it without private notes and lose access after revocation", async ({
  browser,
}) => {
  const owner = await newTeacher(browser, "owner", OWNER_NAME);
  const recipient = await newTeacher(browser, "recipient", `Thầy Minh ${RUN_ID}`);
  const studentEmail = `sharing-student-${RUN_ID}@example.test`;
  await createConfirmedStudent(studentEmail, `sharing-pass-${RUN_ID}`, "Học viên");
  const { lessonId, versionId } = await publishFixture(owner.id);
  const readerPath = `/lessons/${lessonId}?version=${versionId}`;
  try {
    await owner.page.goto(`/teach/lessons/${lessonId}/sharing`);
    await owner.page.getByLabel("Email giáo viên nhận", { exact: true }).fill(studentEmail);
    await owner.page.getByRole("button", { name: "Chia sẻ", exact: true }).click();
    await expect(owner.page.getByRole("alert").filter({ hasText: "giáo viên khác" })).toBeVisible();
    await owner.page.getByLabel("Email giáo viên nhận", { exact: true }).fill(recipient.email);
    await owner.page.getByRole("button", { name: "Chia sẻ", exact: true }).click();
    await expect(owner.page.getByText("Đã chia sẻ phiên bản cho giáo viên nhận.")).toBeVisible();
    await expect(owner.page.locator("#active-shares + ul")).toContainText("Chỉ xem");

    await recipient.page.goto("/teach/library");
    await expect(recipient.page.getByRole("heading", { name: LESSON_TITLE })).toBeVisible();
    await expect(recipient.page.getByText("Chỉ xem", { exact: true })).toBeVisible();
    await expect(
      recipient.page.getByRole("button", { name: "Sao chép thành bài của tôi" }),
    ).toHaveCount(0);
    await recipient.page.getByRole("link", { name: "Xem bài", exact: true }).click();
    await expect(
      recipient.page.getByRole("heading", { name: LESSON_TITLE, exact: true }),
    ).toBeVisible();
    expect(await recipient.page.content()).not.toContain(SECRET_NOTE);
    const notes = await recipient.page.request.get(
      `/api/lessons/${lessonId}/notes?version=${versionId}`,
    );
    expect(notes.ok()).toBe(false);

    await owner.page.getByRole("radio", { name: "Xem và sao chép thành bài của họ" }).check();
    await owner.page.getByLabel("Email giáo viên nhận", { exact: true }).fill(recipient.email);
    await owner.page.getByLabel(/bản sao thuộc về người nhận/).check();
    await owner.page.getByRole("button", { name: "Chia sẻ", exact: true }).click();
    await expect(owner.page.locator("#active-shares + ul")).toContainText("Xem và sao chép");
    await expect(owner.page.locator("#active-shares + ul > li")).toHaveCount(1);

    await recipient.page.goto("/teach/library");
    await recipient.page.getByRole("button", { name: "Sao chép thành bài của tôi" }).click();
    await recipient.page.waitForURL(/\/teach\/lessons\/lesson-[a-f0-9]{32}\/edit$/);
    const copyId = recipient.page.url().split("/").at(-2) ?? "";
    await expect(recipient.page.getByLabel("Tên bài", { exact: true })).toHaveValue(LESSON_TITLE);
    const { data: copy } = await adminClient()
      .from("lessons")
      .select("owner_id, draft_content, copy_attribution")
      .eq("id", copyId)
      .single();
    expect(copy?.owner_id).toBe(recipient.id);
    expect(JSON.stringify(copy?.draft_content)).not.toContain(SECRET_NOTE);
    await recipient.page.goto("/teach");
    await expect(recipient.page.getByText(`của ${OWNER_NAME}`)).toBeVisible();
    await expect(recipient.page.locator(`a[href="/teach/lessons/${copyId}/sharing"]`)).toHaveCount(
      0,
    );

    await owner.page.getByRole("button", { name: `Thu hồi quyền của ${recipient.email}` }).click();
    await expect(owner.page.getByRole("heading", { name: "Đã thu hồi" })).toBeVisible();
    await recipient.page.goto("/teach/library");
    await expect(recipient.page.getByText("Chưa có bài nào được chia sẻ với bạn.")).toBeVisible();
    await recipient.page.goto(readerPath);
    await expect(
      recipient.page.getByRole("heading", { name: LESSON_TITLE, exact: true }),
    ).toHaveCount(0);
    await recipient.page.goto(`/teach/lessons/${copyId}/edit`);
    await expect(recipient.page.getByLabel("Tên bài", { exact: true })).toHaveValue(LESSON_TITLE);

    await owner.page.goto("/teach");
    await owner.page
      .getByRole("listitem")
      .filter({ hasText: LESSON_TITLE })
      .getByRole("button", { name: "Tạo bản sao", exact: true })
      .click();
    await owner.page.waitForURL(/\/teach\/lessons\/lesson-[a-f0-9]{32}\/edit$/);
    await expect(owner.page.getByLabel("Tên bài", { exact: true })).toHaveValue(
      `${LESSON_TITLE} (bản sao)`,
    );
  } finally {
    await Promise.all([owner.page.context().close(), recipient.page.context().close()]);
  }
});
