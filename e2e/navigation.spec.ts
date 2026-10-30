import { expect, test } from "@playwright/test";

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
      await expect(
        page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", {
          name: "Vào lớp",
          exact: true,
        }),
      ).toBeVisible();
    }
    await page.goto("/");
    await expect(
      page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", {
        name: "Đăng nhập",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({ path: `test-results/home-flow-${width}.png`, fullPage: true });
  });
}

test("teachers can reach teaching and learning directly from the header", async ({ page }) => {
  // Only the header's account summary is simulated; protected routes retain their real guards.
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { user: { name: "Giáo viên", role: "teacher", isAdmin: false } } }),
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(navigation.getByRole("link", { name: "Giảng dạy", exact: true })).toHaveAttribute(
    "href",
    "/teach",
  );
  await expect(navigation.getByRole("link", { name: "Lớp của tôi", exact: true })).toHaveAttribute(
    "href",
    "/classes",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("students see their classes without a teaching shortcut", async ({ page }) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { user: { name: "Học viên", role: "student", isAdmin: false } } }),
  );
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(navigation.getByRole("link", { name: "Lớp của tôi", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Giảng dạy", exact: true })).toHaveCount(0);
});
