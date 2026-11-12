import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

const ORIGIN = "http://127.0.0.1:3217";

async function readJsonLd(page: Page) {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  return scripts.map((script): unknown => JSON.parse(script));
}

test("robots and sitemap expose public pages and keep private areas out", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /teach");
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Disallow: /lessons/*/slide");
  expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`<loc>${ORIGIN}/for-teachers</loc>`);
  expect(sitemap).toContain(`<loc>${ORIGIN}/lessons/lesson-01</loc>`);
  expect(sitemap).toContain(`<loc>${ORIGIN}/guide</loc>`);
  expect(sitemap).not.toContain("?version=");
});

// Crawlers load every URL directly. A click made before hydration finishes can leave the previous
// page's head tags behind for the rest of the visit, so head tags are checked after a fresh load.
test("the teacher landing page has a clear heading, description, canonical and FAQ data", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Cho giáo viên", exact: true }).click();
  await page.waitForURL("**/for-teachers");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Mở lớp dạy online cho học viên Việt Nam",
  );
  await expect(page).toHaveTitle("Mở lớp dạy online cho học viên Việt Nam | Reng");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Google Meet/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${ORIGIN}/for-teachers`,
  );
  const [graph] = await readJsonLd(page);
  expect(JSON.stringify(graph)).toContain('"@type":"FAQPage"');
  await page.getByRole("link", { name: "Đăng ký giáo viên" }).first().click();
  await page.waitForURL("**/sign-up/teacher");
});

test("lesson pages use the lesson URL as canonical and describe the lesson", async ({ page }) => {
  await page.goto("/lessons");
  await page.getByRole("link", { name: "Đọc bài" }).first().click();
  await page.waitForURL(/\/lessons\/lesson-01\?version=/);
  await page.reload();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${ORIGIN}/lessons/lesson-01`,
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
  const [resource] = await readJsonLd(page);
  expect(resource).toMatchObject({ "@type": "LearningResource", inLanguage: "ja" });
  await page.goto("/lessons/lesson-01/slide#1");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("the home page names the service and the landing page fits a 360px screen", async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await context.newPage();
  await page.goto("/");
  // Next serializes the root canonical without a trailing slash; both forms are the same URL.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", ORIGIN);
  await expect(page.getByRole("heading", { name: "Tôi muốn giảng dạy" })).toBeVisible();
  for (const path of ["/", "/for-teachers"]) {
    await page.goto(path);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits, path).toBe(true);
  }
  await context.close();
});

test("the user guide is linked from every page, covers both roles and fits a 360px screen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Hướng dẫn sử dụng" }).click();
  await expect(page).toHaveURL(/\/guide$/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Hướng dẫn sử dụng" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${ORIGIN}/guide`);
  await expect(page.getByRole("heading", { name: "Dành cho giáo viên" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dành cho học viên" })).toBeVisible();
  // On a wide screen the contents stay beside the text and mark the section being read.
  const contents = page.getByRole("navigation", { name: "Mục lục hướng dẫn" });
  const daily = contents.getByRole("link", { name: "Bài luyện hằng ngày" });
  await daily.click();
  await expect(page).toHaveURL(/#teacher-daily$/);
  await expect(daily).toHaveAttribute("aria-current", "location");
  await page.setViewportSize({ width: 360, height: 780 });
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
  // On a phone they fold into a bar that names the section being read and opens the list.
  const toggle = contents.getByRole("button", { name: /^Mục lục/ });
  await expect(contents.getByRole("link", { name: "Làm bài tập" })).toBeHidden();
  // From the top of the page the bar sits low on the screen; the list must still open in view.
  await page.evaluate(() => window.scrollTo(0, 0));
  await toggle.click();
  await expect(page.locator("#guide-toc-list")).toBeInViewport({ ratio: 1 });
  await contents.getByRole("link", { name: "Làm bài tập" }).click();
  await expect(page).toHaveURL(/#learner-practice$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toContainText("Làm bài tập");
  await expect(page.getByRole("heading", { name: "Làm bài tập" })).toBeInViewport();
});
