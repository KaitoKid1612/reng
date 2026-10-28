import { expect, test } from "@playwright/test";

// The default suite runs without Supabase: classroom features must fail closed and explain why.
test("classroom routes stay closed without Supabase and old teacher sign-in redirects", async ({
  page,
  request,
  baseURL,
}) => {
  const legacy = await request.get("/teach/sign-in", { maxRedirects: 0 });
  expect(legacy.status()).toBe(308);
  expect(legacy.headers().location).toMatch(/\/sign-in\?next=\/teach$/);
  for (const path of ["/classes", "/teach", "/review", "/mistakes", "/progress"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307);
    expect(response.headers().location).toContain(`/sign-in?next=${encodeURIComponent(path)}`);
  }
  const me = await request.get("/api/me");
  expect(await me.json()).toEqual({ user: null });
  expect(me.headers()["cache-control"]).toContain("no-store");
  const attempt = await request.post("/api/assignments/any/attempts", {
    headers: { Origin: new URL(baseURL ?? "").origin },
  });
  expect(attempt.status()).toBe(503);
  await page.goto("/sign-in?next=/classes");
  await expect(page.getByText("chưa được kích hoạt")).toBeVisible();
  await page.goto("/join-class?code=abcd-efgh");
  await expect(page.getByText("Lớp học chưa được kích hoạt")).toBeVisible();
  await page.goto("/vocabulary/lesson-01");
  await page.getByRole("button", { name: "Lật thẻ", exact: true }).click();
  await expect(page.getByText("xin chào")).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng nhập tài khoản học viên" })).toBeVisible();
});
