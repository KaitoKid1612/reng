import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "@playwright/test";

import { HistoryArchiveView } from "../components/history/history-archive-view";
import { importHistorySheets } from "../lib/history-sheet-import";

const ID = "00000000-0000-4000-8000-000000000001";
const archive = importHistorySheets(
  "viet",
  {
    rows: [
      ["Ngày", "Nội dung", "Tổng câu", "Đúng", "Sai", "Chưa làm", "Điểm %"],
      ["2026-10-20", "Bài kiểm thử tự soạn", 2, 1, 1, 0, "50"],
      ["2026-10-21", "Ngày chưa chấm", 2],
    ],
  },
  {
    rows: [
      [
        "Ngày",
        "Bài",
        "Câu",
        "Dạng bài",
        "Câu hỏi",
        "Câu trả lời của học sinh",
        "Kết quả",
        "Chấm lúc",
      ],
      [
        "2026-10-20",
        "Bài thử",
        "1",
        "Điền",
        "Đề tự soạn",
        "<script>window.historyInjected=true</script>",
        "SAI — cần xem lại",
        "",
      ],
      ["2026-10-20", "Bài thử", "2", "Điền", "Câu đúng", "正しい", "OK", ""],
    ],
  },
);

// Tests the real, server-rendered history view with fictional data. Authentication and RLS
// are tested separately; no test-only route or personal archive is exposed by the application.
for (const width of [1280, 360]) {
  test(`history details show source grades and fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/sources");
    const html = renderToStaticMarkup(
      createElement(HistoryArchiveView, {
        id: ID,
        archive,
        importedAt: "2026-10-30T03:00:00Z",
        query: { date: "2026-10-20", outcome: "incorrect" },
      }),
    );
    await page.locator("main").evaluate((main, markup) => {
      main.innerHTML = markup;
    }, html);
    await expect(page.getByText("Điểm gốc: 50 / 100", { exact: true })).toBeVisible();
    const tiles = page.locator(".history-stats .stat-tile");
    await expect(tiles.nth(0).locator("strong")).toHaveText("2");
    await expect(tiles.nth(1).locator("strong")).toHaveText("50%");
    await expect(tiles.nth(1)).toContainText("1 / 2 câu đã chấm");
    await expect(tiles.nth(2).locator("strong")).toHaveText("50 / 100");
    await expect(tiles.nth(2)).toContainText("Lần đầu có điểm");
    // A blank source score stays "no score" on the chart and the day list, never a zero.
    await expect(page.locator(".score-chart-column")).toHaveCount(2);
    await expect(page.locator(".score-chart-empty")).toHaveCount(1);
    await expect(page.locator(".score-chart-readout")).toHaveText("Đang xem 20/10/2026: 50 / 100");
    await expect(
      page.getByRole("link", { name: "20/10/2026, 50 / 100", exact: true }),
    ).toHaveAttribute("aria-current", "date");
    await expect(
      page.getByRole("link", { name: "21/10/2026, chưa có điểm", exact: true }),
    ).toBeVisible();
    const filters = page.getByRole("navigation", { name: "Lọc câu theo kết quả" });
    await expect(filters.getByRole("link")).toHaveText(["Tất cả 2", "Đúng 1", "Sai 1"]);
    await expect(filters.getByRole("link", { name: "Sai 1" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    // Kinds with fewer than five graded answers become one summed row with a list behind it.
    const otherKinds = page.locator(".history-kinds-other");
    await expect(otherKinds).toContainText("Các dạng ít câu (1 dạng)");
    await expect(otherKinds).toContainText("50% · 1/2 câu");
    await expect(otherKinds.getByRole("listitem")).toBeHidden();
    await otherKinds.getByText("Xem 1 dạng có dưới 5 câu đã chấm", { exact: true }).click();
    await expect(otherKinds.getByRole("listitem")).toContainText(["Điền"]);
    await expect(page.getByRole("status")).toHaveText("Hiển thị 1 / 2 câu của ngày đã chọn.");
    await page.locator(".history-answer summary").click();
    await expect(
      page
        .locator(".history-text")
        .filter({ hasText: "<script>window.historyInjected=true</script>" }),
    ).toBeVisible();
    expect(await page.evaluate(() => "historyInjected" in window)).toBe(false);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `test-results/history-${width}.png`, fullPage: true });
    const ungraded = renderToStaticMarkup(
      createElement(HistoryArchiveView, {
        id: ID,
        archive,
        importedAt: "2026-10-30T03:00:00Z",
        query: { date: "2026-10-21" },
      }),
    );
    await page.locator("main").evaluate((main, markup) => {
      main.innerHTML = markup;
    }, ungraded);
    await expect(page.getByText("Điểm gốc: Chưa có điểm", { exact: true })).toBeVisible();
  });
}

test("history routes require authentication and stay outside the sitemap", async ({ request }) => {
  for (const path of ["/history", `/history/${ID}`]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/sign-in?next=");
    expect(await response.text()).not.toContain("Bài kiểm thử tự soạn");
  }
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /history");
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/history");
});
