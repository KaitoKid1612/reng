import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

const n5 = JSON.parse(readFileSync("content/kanji/n5.json", "utf8")) as {
  items: { kanji: string; group: string; words: { written: string; reading: string }[] }[];
};
// Written form → reading for the words of the N5 body group (口, 目, 耳, 手, 足).
const readings = new Map(
  n5.items
    .filter((item) => item.group === "body")
    .flatMap((item) => item.words.map((word) => [word.written, word.reading] as const)),
);

test("learners find the N5 kanji from self-study, read a card and practise one group", async ({
  page,
}) => {
  await page.goto("/self-study");
  await page.getByRole("link", { name: /Kanji N5–N4/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kanji N5 cho người Việt");
  await expect(page.locator(".kanji-card")).toHaveCount(n5.items.length);

  // 週 was asked in an official sample paper (先週, 2012).
  const card = page.locator("#kanji-週");
  await expect(card).toContainText("Chu");
  await expect(card).toContainText("Đã ra đề");
  await expect(card.locator(".kanji-paper")).toContainText("先週 (2012)");

  await page.getByRole("link", { name: "Kanji N4", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kanji N4 cho người Việt");
  await page.getByRole("link", { name: "Kanji N5", exact: true }).click();

  await page.locator("#body").getByRole("link", { name: "Luyện nhóm này" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Luyện kanji N5: Cơ thể");
  // The exam kinds start ticked; this run types the readings instead.
  await expect(
    page.getByLabel("Chọn cách đọc: bốn cách đọc gần giống nhau, như đề JLPT"),
  ).toBeChecked();
  await page.getByLabel("Chọn cách đọc: bốn cách đọc gần giống nhau, như đề JLPT").uncheck();
  await page.getByLabel("Nhận mặt chữ: chọn chữ Hán đúng").uncheck();
  await page.getByLabel("Đọc chữ: nhìn chữ Hán, gõ cách đọc").check();
  await page.getByLabel("Số câu mỗi phiên").selectOption("all");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  for (let index = 0; index < readings.size; index++) {
    const written = (await page.getByTestId("kanji-prompt").textContent()) ?? "";
    expect(readings.has(written)).toBe(true);
    await page.getByLabel("Cách đọc bằng hiragana").fill(readings.get(written) ?? "");
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await expect(page.locator(".answer-feedback")).toContainText("Đúng rồi!");
    await page
      .getByRole("button", { name: index + 1 === readings.size ? "Xem kết quả" : "Câu tiếp theo" })
      .click();
  }
  await expect(page.locator(".result-score")).toContainText(`${readings.size}`);
});

test("the kanji lists fit a phone and unknown levels are not found", async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const level of ["n5", "n4"]) {
    await page.goto(`/jlpt-kanji/${level}`);
    await expect(page.locator(".kanji-card").first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  expect((await request.get("/jlpt-kanji/n3")).status()).toBe(404);
});

test("the exam kinds offer near-miss readings, and the Hán Việt rules are counted", async ({
  page,
}) => {
  await page.goto("/jlpt-kanji/n5/practice?group=time");
  await page.getByLabel("Nhận mặt chữ: chọn chữ Hán đúng").uncheck();
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.locator(".choice-option")).toHaveCount(4);
  const options = await page.locator(".choice-option").allTextContents();
  expect(options.every((option) => /^[ぁ-ゖ]+$/u.test(option.trim()))).toBe(true);

  await page.goto("/jlpt-kanji/n5");
  const rulesLink = page.getByRole("link", { name: "xem quy luật đoán âm On từ âm Hán Việt" });
  await expect(rulesLink).toHaveAttribute("href", "/jlpt-kanji/han-viet");
  await page.goto("/jlpt-kanji/han-viet");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đoán âm On từ âm Hán Việt");
  const ending = page.getByRole("row", { name: /^-c, -ch/ });
  await expect(ending).toContainText("く hoặc き");
  await expect(ending.locator(".han-viet-rate")).toHaveText(/^\d+\/\d+$/);
});
