import { expect, test } from "@playwright/test";

test("lists five lessons, reads an original sample and searches grammar without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/lessons");
  await expect(page.locator(".lesson-card")).toHaveCount(5);
  await page.getByRole("link", { name: "Đọc bài", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Làm quen và chào hỏi", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sample-notice")).toContainText("chờ giảng viên duyệt");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/lesson-reader-mobile.png" });
  await page.goto("/grammar");
  await page.getByLabel("Từ khóa", { exact: true }).fill("di den");
  await expect(page.getByRole("status")).toContainText("1 mẫu câu");
  await page.getByRole("link", { name: "Đi lại mỗi ngày", exact: true }).click();
  await expect(page).toHaveURL(/lesson-05.*#g0501$/);
});

test("public HTML and anonymous endpoints never expose teacher notes", async ({ request }) => {
  for (const path of [
    "/lessons/lesson-01",
    "/lessons/lesson-01/slide",
    "/lessons/lesson-01/presenter",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).not.toContain("PRIVATE_TEACHER_NOTE");
    expect(html).not.toContain("teacherNotes");
  }
  const notes = await request.get("/api/lessons/lesson-01/notes");
  expect(notes.status()).toBe(401);
  expect(notes.headers()["cache-control"]).toContain("no-store");
  const crossOrigin = await request.post("/api/auth/sign-in", {
    headers: { Origin: "https://example.invalid" },
  });
  expect(crossOrigin.status()).toBe(403);
});

test("slide navigation keeps one-based hashes and reveals fragments before advancing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/lessons/lesson-01/slide#5");
  await expect(page.locator(".reveal")).toHaveAttribute("data-ready", "true");
  await expect(page.getByTestId("slide-counter")).toHaveText("5 / 9");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("section.present .fragment")).toHaveClass(/visible/);
  await expect(page.getByTestId("slide-counter")).toHaveText("5 / 9");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("slide-counter")).toHaveText("6 / 9");
  await expect(page).toHaveURL(/#6$/);
  await page.reload();
  await expect(page.getByTestId("slide-counter")).toHaveText("6 / 9");
  expect(errors).toEqual([]);
});

test("public practice feedback is fetched only when requested and invalid versions return 404", async ({
  page,
  request,
}) => {
  await page.goto("/lessons/lesson-01/slide#8");
  await expect(page.locator(".reveal")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".quiz-feedback")).toHaveCount(0);
  await page.getByRole("button", { name: "Hiện đáp án", exact: true }).click();
  await expect(page.locator(".quiz-feedback")).toContainText("です");
  const missing = await request.get("/lessons/lesson-01?version=not-a-version");
  expect(missing.status()).toBe(404);
});

test("presenter receives and controls only its lesson/version channel", async ({
  page,
  context,
}) => {
  await page.goto("/lessons/lesson-01/slide#1");
  await expect(page.locator(".reveal")).toHaveAttribute("data-ready", "true");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Presenter", exact: true }).click();
  const presenter = await popupPromise;
  await expect(presenter.getByRole("status")).toContainText("Đang chiếu slide 1");
  await presenter.getByRole("button", { name: "Tiếp", exact: true }).click();
  await expect(page.getByTestId("slide-counter")).toHaveText("2 / 9");
  const other = await context.newPage();
  await other.goto("/lessons/lesson-02/slide#1");
  await expect(other.locator(".reveal")).toHaveAttribute("data-ready", "true");
  await presenter.getByRole("button", { name: "Tiếp", exact: true }).click();
  await expect(page.getByTestId("slide-counter")).toHaveText("3 / 9");
  await expect(other.getByTestId("slide-counter")).toHaveText("1 / 9");
});

test("print output includes every slide without private notes or clipped fragments", async ({
  page,
}) => {
  await page.goto("/lessons/lesson-01/slide?print-pdf");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-slide")).toHaveCount(9);
  await expect(page.locator(".print-toolbar")).toBeHidden();
  expect(await page.content()).not.toContain("PRIVATE_TEACHER_NOTE");
  await page.pdf({
    path: "test-results/lesson-01.pdf",
    printBackground: true,
    preferCSSPageSize: true,
  });
});

test("vocabulary and revealed quizzes stay within the presentation viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (let number = 1; number <= 5; number++) {
    const id = `lesson-${String(number).padStart(2, "0")}`;
    await page.goto(`/lessons/${id}/slide#2`);
    await expect(page.locator(".reveal")).toHaveAttribute("data-ready", "true");
    for (const slideNumber of [2, 8]) {
      await page.evaluate((value) => {
        window.location.hash = `#${value}`;
      }, slideNumber);
      await expect(page.getByTestId("slide-counter")).toHaveText(`${slideNumber} / 9`);
      if (slideNumber === 8) {
        await page.getByRole("button", { name: "Hiện đáp án", exact: true }).click();
        await expect(page.locator(".quiz-feedback")).toBeVisible();
      }
      const bounds = await page.evaluate(() => {
        const stage = document.querySelector(".slide-stage")?.getBoundingClientRect();
        const slide = document.querySelector("section.present")?.getBoundingClientRect();
        if (!stage || !slide) {
          throw new Error("Presentation geometry is unavailable.");
        }
        return {
          top: slide.top - stage.top,
          bottom: stage.bottom - slide.bottom,
          left: slide.left - stage.left,
          right: stage.right - slide.right,
        };
      });
      for (const [edge, distance] of Object.entries(bounds)) {
        expect(distance, `${id} slide ${slideNumber} ${edge}`).toBeGreaterThanOrEqual(-1);
      }
    }
  }
  await page.screenshot({ path: "test-results/lesson-slide-desktop.png" });
});
