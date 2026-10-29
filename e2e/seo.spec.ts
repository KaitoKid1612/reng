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
    "Dạy tiếng Trung online cho học viên Việt Nam",
  );
  await expect(page).toHaveTitle("Dạy tiếng Trung online cho học viên Việt Nam | Reng");
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
  await expect(page.getByRole("heading", { name: "Bạn là giáo viên tiếng Trung?" })).toBeVisible();
  for (const path of ["/", "/for-teachers"]) {
    await page.goto(path);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits, path).toBe(true);
  }
  await context.close();
});
