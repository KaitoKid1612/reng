import { test, expect } from "@playwright/test";

import kana from "../content/kana.json";

test("redirects legacy URLs to English routes and preserves the script query", async ({
  request,
}) => {
  const practiceResponse = await request.get("/kana/luyen?script=katakana", { maxRedirects: 0 });
  expect(practiceResponse.status()).toBe(308);
  expect(practiceResponse.headers().location).toMatch(/\/kana\/practice\?script=katakana$/);

  const sourcesResponse = await request.get("/nguon-du-lieu", { maxRedirects: 0 });
  expect(sourcesResponse.status()).toBe(308);
  expect(sourcesResponse.headers().location).toMatch(/\/sources$/);
});

test("navigates to the full kana chart and switches scripts without overflow at 360px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("link", { name: "Học bảng chữ cái", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bảng chữ cái", exact: true })).toBeVisible();
  await expect(page.locator("button.kana-cell")).toHaveCount(104);
  await page.getByRole("button", { name: "Katakana" }).click();
  await expect(page.getByRole("button", { name: "ア, a", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: "test-results/kana-mobile.png",
    fullPage: true,
  });
  await page.screenshot({ path: "test-results/kana-mobile-viewport.png" });
});

test("completes ten questions, shows feedback and retries incorrect answers", async ({ page }) => {
  await page.goto("/kana/practice?script=katakana");
  await expect(page.getByRole("radio", { name: "Katakana" })).toBeChecked();
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(page.locator("#input-error")).toContainText("nhập cách đọc");
  const seen = new Set<string>();
  for (let i = 0; i < 10; i++) {
    const character = await page.getByTestId("question-kana").innerText();
    expect(seen.has(character)).toBe(false);
    seen.add(character);
    const item = kana.items.find((candidate) => candidate.kana === character);
    if (!item) {
      throw new Error(`No kana fixture matches ${character}`);
    }
    await page
      .getByLabel("Cách đọc bằng romaji", { exact: true })
      .fill(i === 0 ? "wrong" : item.acceptedRomaji[0]);
    await page.getByLabel("Cách đọc bằng romaji", { exact: true }).press("Enter");
    await expect(page.getByRole("status").first()).toContainText(
      i === 0 ? "Chưa đúng" : "Đúng rồi",
    );
    await page.getByLabel("Cách đọc bằng romaji", { exact: true }).press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Bạn đã hoàn thành phiên luyện" })).toBeVisible();
  await expect(page.locator(".result-score")).toContainText("9");
  await page.getByRole("button", { name: "Luyện lại câu sai" }).click();
  await expect(page.locator(".practice-top")).toContainText("Câu 1 / 1");
});

test("disables empty practice selections and exposes the keyboard skip link", async ({ page }) => {
  await page.goto("/kana/practice");
  await page.getByRole("checkbox", { name: "Âm cơ bản", exact: true }).uncheck();
  await expect(page.getByRole("button", { name: "Bắt đầu luyện" })).toBeDisabled();
  await page.goto("/kana");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Đến nội dung chính" })).toBeFocused();
});

test("reports unavailable Japanese speech instead of using another language", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [{ lang: "en-US" }],
        addEventListener() {},
        removeEventListener() {},
        cancel() {},
        speak() {
          throw new Error("Must not use a non-Japanese voice");
        },
      },
    });
  });
  await page.goto("/kana");
  await page.getByRole("button", { name: "あ, a", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("chưa có giọng Nhật");
});
