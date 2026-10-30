import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

const lesson = JSON.parse(readFileSync("content/lessons/lesson-01.json", "utf8")) as {
  content: { vocab: { jp: string; kanji?: string; vi: string }[] };
};
// Written form → kana reading for the lesson's kanji words (私, 名前, 学生, 先生).
const readings = new Map(
  lesson.content.vocab
    .filter((item) => item.kanji && /\p{Script=Han}/u.test(item.kanji))
    .map((item) => [item.kanji ?? "", item.jp]),
);

test("learners practise a lesson's kanji readings, see mistakes and retry them on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/lessons/lesson-01");
  await page.getByRole("link", { name: `Luyện kanji (${readings.size} từ)` }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Luyện kanji");

  await page.getByLabel("Nhận mặt chữ: chọn chữ Hán đúng").uncheck();
  await page.getByLabel("Số câu mỗi phiên").selectOption("all");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();

  for (let index = 0; index < readings.size; index++) {
    const written = (await page.getByTestId("kanji-prompt").textContent()) ?? "";
    // The first question is answered wrongly on purpose to exercise the mistake list.
    const answer = index === 0 ? "まちがい" : (readings.get(written) ?? "");
    await page.getByLabel("Cách đọc bằng hiragana").fill(answer);
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await expect(page.locator(".answer-feedback")).toContainText(
      index === 0 ? "Chưa đúng." : "Đúng rồi!",
    );
    await page
      .getByRole("button", { name: index + 1 === readings.size ? "Xem kết quả" : "Câu tiếp theo" })
      .click();
  }

  await expect(page.locator(".result-score")).toContainText(`${readings.size - 1}`);
  await expect(page.locator(".mistake-list li")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Luyện lại câu sai" }).click();
  const retried = (await page.getByTestId("kanji-prompt").textContent()) ?? "";
  await page.getByLabel("Cách đọc bằng hiragana").fill(readings.get(retried) ?? "");
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(page.locator(".answer-feedback")).toContainText("Đúng rồi!");
});

test("choice questions offer other kanji from the same lesson", async ({ page }) => {
  await page.goto("/kanji/lesson-01");
  await page.getByLabel("Đọc chữ: nhìn chữ Hán, gõ cách đọc").uncheck();
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  const options = page.locator(".choice-option");
  await expect(options).toHaveCount(4);
  for (const option of await options.allTextContents()) {
    expect([...readings.keys()]).toContain(option);
  }
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(page.locator("#kanji-input-error")).toContainText("chọn một đáp án");
});
