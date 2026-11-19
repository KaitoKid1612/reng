import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

const n4 = JSON.parse(readFileSync("content/vocab/n4.json", "utf8")) as {
  groups: { id: string; title: string }[];
  items: { reading: string; group: string; example: { ja: string; choices: string[] } }[];
};
const firstGroup = n4.groups[0];
// The answer of each fill-in question of the first topic, keyed by the sentence with its blank.
const answers = new Map(
  n4.items
    .filter((item) => item.group === firstGroup.id)
    .map((item) => [
      item.example.ja.replace(/\[\[(.+?)\]\]/u, "（　　）"),
      item.example.ja.match(/\[\[(.+?)\]\]/u)?.[1] ?? "",
    ]),
);

test("learners open N4 vocabulary from self-study and fill blanks like the exam", async ({
  page,
}) => {
  await page.goto("/self-study");
  await page.getByRole("link", { name: /Từ vựng N4/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Từ vựng N4 theo chủ đề");
  await expect(page.locator(".vocab-entry")).toHaveCount(n4.items.length);
  // 寝坊 (ねぼう) was asked in the 2012 paper.
  await expect(page.locator("#vocab-ねぼう")).toContainText("Đã ra đề 2012");

  await page.locator(`#${firstGroup.id}`).getByRole("link", { name: "Luyện chủ đề này" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Luyện từ vựng N4: ${firstGroup.title}`,
  );
  await page.getByLabel("Chọn từ gần nghĩa (もんだい4)").uncheck();
  await page.getByLabel("Số câu mỗi phiên").selectOption("all");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  for (let index = 0; index < answers.size; index++) {
    const prompt = (await page.getByTestId("vocab-prompt").textContent()) ?? "";
    const answer = answers.get(prompt);
    expect(answer, prompt).toBeTruthy();
    await expect(page.locator(".choice-option")).toHaveCount(4);
    await page.locator(".choice-option", { hasText: new RegExp(`^${answer}$`) }).click();
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await expect(page.locator(".answer-feedback")).toContainText("Đúng rồi!");
    await expect(page.locator('.choice-option[data-result="correct"]')).toHaveCount(1);
    await page
      .getByRole("button", { name: index + 1 === answers.size ? "Xem kết quả" : "Câu tiếp theo" })
      .click();
  }
  await expect(page.locator(".result-score")).toContainText(`${answers.size}`);
});

test("the vocabulary list fits a phone and unknown levels are not found", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/jlpt-vocab/n4");
  await expect(page.locator(".vocab-entry").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect((await request.get("/jlpt-vocab/n9")).status()).toBe(404);
});
