import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

for (const width of [1280, 360]) {
  test(`visitors can find classroom, self-study and teaching paths at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Tự học tiếng Nhật, chưa cần tài khoản", exact: true }),
    ).toHaveAttribute("href", "/kana");
    await page.getByRole("link", { name: "Vào lớp bằng mã", exact: true }).click();
    await expect(page).toHaveURL(/\/join-class$/);
    await expect(page.getByRole("heading", { level: 1, name: "Vào lớp" })).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: "Học bảng chữ cái", exact: true }).click();
    await expect(page).toHaveURL(/\/kana$/);
    await page.goto("/");
    await page.getByRole("link", { name: "Tìm hiểu cách dạy trên Reng" }).click();
    await expect(page).toHaveURL(/\/for-teachers$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "tiếng Nhật và tiếng Trung",
    );

    for (const path of ["/", "/join-class", "/for-teachers"]) {
      await page.goto(path);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        path,
      ).toBe(true);
      await openMenuOnPhone(page, width);
      await expect(
        page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", {
          name: "Vào lớp",
          exact: true,
        }),
      ).toBeVisible();
    }
    await page.goto("/");
    await openMenuOnPhone(page, width);
    await expect(
      page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", {
        name: "Đăng nhập",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({ path: `test-results/home-flow-${width}.png`, fullPage: true });
  });
}

// Phones fold the menu behind a toggle; wider screens show it in the header.
async function openMenuOnPhone(page: Page, width: number) {
  if (width > 600) {
    return;
  }
  await page.getByRole("button", { name: "Menu", exact: true }).click();
}

test("the phone header keeps the person's main page and folds the rest", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/kana");
  const header = page.locator(".site-header");
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(header.locator(".header-shortcut")).toHaveText("Đăng nhập");
  await expect(navigation).toBeHidden();
  // The folded header leaves the first screen to the page, not to a wall of links.
  expect((await header.boundingBox())?.height ?? 0).toBeLessThan(90);
  const toggle = page.getByRole("button", { name: "Menu", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(page.getByRole("button", { name: "Đóng", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await navigation.getByRole("link", { name: "Luyện kana", exact: true }).click();
  await expect(page).toHaveURL(/\/kana\/practice$/);
  await expect(navigation).toBeHidden();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeFocused();
});

test("teachers can reach teaching and learning directly from the header", async ({ page }) => {
  // Only the header's account summary is simulated; protected routes retain their real guards.
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        user: { name: "Giáo viên", role: "teacher", isAdmin: false, hasLearningHistory: false },
      },
    }),
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.locator(".site-header .header-shortcut")).toHaveText("Giảng dạy");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(navigation.getByRole("link", { name: "Giảng dạy", exact: true })).toHaveAttribute(
    "href",
    "/teach",
  );
  await expect(navigation.getByRole("link", { name: "Lớp của tôi", exact: true })).toHaveAttribute(
    "href",
    "/classes",
  );
  // Signed-in teachers no longer see the visitor pages or an empty Sheet archive.
  await expect(navigation.getByRole("link", { name: "Cho giáo viên", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Lịch sử Sheet", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("students see their classes first, and the Sheet archive only when they have one", async ({
  page,
}) => {
  let hasLearningHistory = false;
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: { user: { name: "Học viên", role: "student", isAdmin: false, hasLearningHistory } },
    }),
  );
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(navigation.getByRole("link").first()).toHaveText("Lớp của tôi");
  await expect(navigation.getByRole("link", { name: "Giảng dạy", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Vào lớp", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Lịch sử Sheet", exact: true })).toHaveCount(0);
  hasLearningHistory = true;
  await page.goto("/lessons");
  await expect(
    navigation.getByRole("link", { name: "Lịch sử Sheet", exact: true }),
  ).toHaveAttribute("href", "/history");
});
