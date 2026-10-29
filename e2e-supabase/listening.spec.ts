import { execFileSync } from "node:child_process";
import { mkdir, unlink, writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { audioHash, canonicalAudio } from "../lib/audio-config";

import { adminClient, createConfirmedStudent, RUN_ID, signIn, TEACHER } from "./support";

import type { Browser, Locator, Page, Route } from "@playwright/test";

declare global {
  interface Window {
    lastAudio?: HTMLMediaElement;
  }
}

test.describe.configure({ mode: "serial" });

const LESSON_ID = `listen-${RUN_ID}`;
const LESSON_TITLE = `Nghe câu ngắn ${RUN_ID}`;
const EDITOR_PATH = `/teach/lessons/${LESSON_ID}/edit`;
const ASSIGNMENT_TITLE = `Luyện nghe ${RUN_ID}`;
const VOICE = "ja-JP-NanamiNeural";
const LISTEN = { prompt: "Người nói đi đâu?", transcript: "がっこうへいきます。" };
const DICTATION = {
  prompt: "Nghe và viết lại bằng hiragana",
  transcript: "わたしはがくせいです。",
  answer: "わたしはがくせいです",
};
const LISTEN_HASH = audioHash(canonicalAudio(LISTEN.transcript, VOICE));
const DICTATION_HASH = audioHash(canonicalAudio(DICTATION.transcript, VOICE));
const learner = {
  email: `listener-${RUN_ID}@example.test`,
  password: `pass-l-${RUN_ID}`,
  name: `Đỗ Thị Lan ${RUN_ID}`,
};

// MPEG-1 Layer III mono frames with zero side information decode as silence (26 ms each).
function silentMp3(frames: number) {
  const bytes = Buffer.alloc(417 * frames);
  for (let frame = 0; frame < frames; frame++) {
    bytes.set([0xff, 0xfb, 0x90, 0xc0], frame * 417);
  }
  return bytes;
}
const LONG_MP3 = silentMp3(400);
const SHORT_MP3 = silentMp3(20);

async function openSection(page: Page, name: RegExp) {
  const summary = page.locator("summary").filter({ hasText: name });
  if ((await summary.locator("..").getAttribute("open")) === null) {
    await summary.click();
  }
}

async function newSignedInPage(browser: Browser, email: string, password: string) {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, email, password);
  return page;
}

// Answers Range requests like a static file host; without them the browser cannot seek.
function fulfillAudio(route: Route, body: Buffer) {
  const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? "");
  if (!range) {
    return route.fulfill({
      contentType: "audio/mpeg",
      body,
      headers: { "Accept-Ranges": "bytes" },
    });
  }
  const start = Number(range[1]);
  const end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
  return route.fulfill({
    status: 206,
    contentType: "audio/mpeg",
    body: body.subarray(start, end + 1),
    headers: { "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${body.length}` },
  });
}

async function serveAudio(page: Page, body: Buffer) {
  await page.route("**/audio/lessons/*.mp3", (route) => fulfillAudio(route, body));
}

// Plays a short file to the end so the next press starts a new listen.
async function listenToEnd(card: Locator, expectedCount: string) {
  await card.getByRole("button", { name: "Nghe", exact: true }).click();
  await expect(card.getByTestId("listen-count")).toHaveText(expectedCount);
  await expect(card.getByRole("button", { name: "Nghe", exact: true })).toBeVisible();
}

test("teacher authors listening questions, generates audio for the saved draft and publishes", async ({
  page,
}) => {
  await signIn(page, TEACHER.email, TEACHER.password, "/teach");
  await page.getByRole("link", { name: "Tạo bài mới", exact: true }).click();
  await page.getByLabel("Mã bài", { exact: true }).fill(LESSON_ID);
  await page.getByLabel("Thứ tự trong khóa", { exact: true }).fill("91");
  await page.getByLabel("Tiêu đề tiếng Việt", { exact: true }).fill(LESSON_TITLE);
  await page.getByRole("button", { name: "Tạo và mở editor", exact: true }).click();
  await page.waitForURL(`**${EDITOR_PATH}`);
  await page.getByLabel("Tiêu đề tiếng Nhật", { exact: true }).fill("ききとり");
  await page.getByLabel("Tóm tắt", { exact: true }).fill("Nghe câu ngắn rồi trả lời.");

  await openSection(page, /^Câu luyện/);
  await page.getByRole("button", { name: "Thêm câu nghe", exact: true }).click();
  const listen = page.locator("fieldset.question-card").filter({ hasText: "Câu 1: nghe" });
  await listen.getByLabel("Đề bài", { exact: true }).fill(LISTEN.prompt);
  await listen.getByLabel(/^Transcript/).fill(LISTEN.transcript);
  await listen.getByLabel("Nội dung lựa chọn 1").fill("がっこう");
  await listen.getByLabel("Nội dung lựa chọn 2").fill("えき");
  await listen.getByLabel("Lựa chọn 1 là đáp án đúng").check();
  await listen.getByLabel("Giới hạn lượt nghe", { exact: true }).fill("2");
  await listen.getByLabel("Giải thích đáp án", { exact: true }).fill("がっこう là trường học.");
  await page.getByRole("button", { name: "Thêm câu chính tả", exact: true }).click();
  const dictation = page.locator("fieldset.question-card").filter({ hasText: "Câu 2: chính tả" });
  await dictation.getByLabel("Đề bài", { exact: true }).fill(DICTATION.prompt);
  await dictation.getByLabel(/^Transcript/).fill(DICTATION.transcript);
  await dictation.getByLabel(/^Các đáp án được chấp nhận/).fill(DICTATION.answer);
  await dictation.getByLabel("Ô nhập", { exact: true }).selectOption("hiragana");
  await dictation.getByLabel("Giải thích đáp án", { exact: true }).fill("Câu tự giới thiệu.");
  await page.getByLabel("Loại slide mới").selectOption({ label: "Tiêu đề" });
  await page.getByRole("button", { name: "Thêm slide", exact: true }).click();
  await page.getByLabel("Dòng tiếng Nhật", { exact: true }).fill("ききとり");
  await page.getByLabel("Dòng tiếng Việt", { exact: true }).fill(LESSON_TITLE);
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText("Đã lưu nháp lúc");
  await expect(page.getByText("2 câu nghe chưa có audio nên chưa xuất bản được.")).toBeVisible();
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  const problems = page.getByRole("region", { name: "Cần sửa trước khi xuất bản" });
  await expect(problems).toContainText("Câu luyện 1: chưa có audio.");
  await expect(problems).toContainText("Câu luyện 2: chưa có audio.");

  // The real script reads the saved draft; files already on disk mean no TTS call is made.
  const files = [LISTEN_HASH, DICTATION_HASH].map((hash) => `public/audio/lessons/${hash}.mp3`);
  await mkdir("public/audio/lessons", { recursive: true });
  let output = "";
  try {
    await Promise.all(files.map((file) => writeFile(file, SHORT_MP3)));
    output = execFileSync(
      "node",
      [
        "--import",
        "tsx",
        "scripts/generate-audio.ts",
        "--generate",
        "--local",
        "--lessons",
        "--db",
        "--sync-db",
        "--lesson",
        LESSON_ID,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          SUPABASE_URL: process.env.E2E_SUPABASE_URL,
          SUPABASE_SECRET_KEY: process.env.E2E_SUPABASE_SECRET_KEY,
          AZURE_SPEECH_KEY: "unused-because-the-files-exist",
          AZURE_SPEECH_REGION: "southeastasia",
          AZURE_SPEECH_VOICE: VOICE,
        },
      },
    );
  } finally {
    await Promise.all(files.map((file) => unlink(file).catch(() => undefined)));
  }
  expect(output).toContain(`${LESSON_ID}: audio hashes written to the draft`);
  const { data: assets } = await adminClient()
    .from("audio_assets")
    .select("hash, url")
    .in("hash", [LISTEN_HASH, DICTATION_HASH]);
  expect(assets).toHaveLength(2);
  expect(assets?.map((asset) => asset.url).sort()).toEqual(
    [LISTEN_HASH, DICTATION_HASH].map((hash) => `/audio/lessons/${hash}.mp3`).sort(),
  );

  await page.reload();
  await openSection(page, /^Câu luyện/);
  await expect(page.getByTestId("question-audio-status")).toHaveText([
    /^Đã có audio/,
    /^Đã có audio/,
  ]);
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText("Đã xuất bản phiên bản mới");
  await page.getByLabel("Ai có thể đọc bản đã xuất bản?").selectOption("public");
  await page.getByLabel(/Nếu chọn công khai/).check();
  await page.getByRole("button", { name: "Lưu quyền đọc", exact: true }).click();
  await expect(page.getByText(/Đã cập nhật quyền đọc/)).toBeVisible();
  await expect(page.getByText("1 phiên bản đã xuất bản.")).toBeVisible();
});

test("learners practise listening with counted plays, rewind, slow speed and a locked transcript", async ({
  page,
}) => {
  let isDictationAvailable = false;
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      window.lastAudio = this;
      return play.call(this);
    };
  });
  await page.route(`**/audio/lessons/${LISTEN_HASH}.mp3`, (route) => fulfillAudio(route, LONG_MP3));
  await page.route(`**/audio/lessons/${DICTATION_HASH}.mp3`, (route) =>
    isDictationAvailable
      ? fulfillAudio(route, SHORT_MP3)
      : route.fulfill({ status: 404, body: "Not found" }),
  );
  await page.goto(`/lessons/${LESSON_ID}`);
  await page.getByRole("link", { name: "Luyện nghe (2 câu)", exact: true }).click();
  await page.waitForURL(`**/listening/${LESSON_ID}?version=*`);
  expect(await page.content(), "transcripts stay out of the page").not.toContain(LISTEN.transcript);

  const listen = page.locator(".question-card").nth(0);
  const count = listen.getByTestId("listen-count");
  const status = listen.getByRole("status");
  const audio = () =>
    page.evaluate(() => ({
      rate: window.lastAudio?.playbackRate,
      preservesPitch: window.lastAudio?.preservesPitch,
      time: window.lastAudio?.currentTime ?? 0,
    }));
  const skipToEnd = () =>
    page.evaluate(() => {
      const element = window.lastAudio;
      if (element) {
        element.currentTime = Math.max(0, element.duration - 0.1);
      }
    });
  await expect(count).toHaveText("Đã nghe 0 lần / tối đa 2");
  await listen.getByRole("button", { name: "Chậm 0.75x", exact: true }).click();
  await listen.getByRole("button", { name: "Nghe", exact: true }).click();
  await expect(count).toHaveText("Đã nghe 1 lần / tối đa 2");
  await expect(status).toHaveText("Đang phát");
  expect(await audio()).toMatchObject({ rate: 0.75, preservesPitch: true });
  await expect.poll(async () => (await audio()).time).toBeGreaterThan(1);
  await listen.getByRole("button", { name: "Lùi 5 giây", exact: true }).click();
  expect((await audio()).time).toBeLessThan(1);
  await listen.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(status).toHaveText("Đã tạm dừng");
  await listen.getByRole("button", { name: "Nghe", exact: true }).click();
  await expect(status).toHaveText("Đang phát");
  await expect(count, "resuming is not a new listen").toHaveText("Đã nghe 1 lần / tối đa 2");
  await skipToEnd();
  await expect(listen.getByRole("button", { name: "Nghe", exact: true })).toBeVisible();
  await listen.getByRole("button", { name: "Nghe", exact: true }).click();
  await expect(count).toHaveText("Đã nghe 2 lần / tối đa 2");
  await skipToEnd();
  await expect(status).toHaveText("Đã hết số lần nghe cho câu này.");
  await expect(listen.getByRole("button", { name: "Nghe", exact: true })).toBeDisabled();
  await page.screenshot({ path: "test-results/listening-desktop.png", fullPage: true });

  await listen.getByRole("radio", { name: "がっこう", exact: true }).check();
  await listen.getByRole("button", { name: "Kiểm tra câu này", exact: true }).click();
  await expect(listen.locator(".answer-feedback")).toContainText("Đúng rồi!");
  await expect(listen.locator(".transcript")).toContainText(LISTEN.transcript);

  const dictation = page.locator(".question-card").nth(1);
  await dictation.getByRole("button", { name: "Nghe", exact: true }).click();
  await expect(dictation.getByRole("status")).toContainText("Chưa tải được audio");
  await expect(dictation.getByTestId("listen-count")).toHaveText("Đã nghe 0 lần");
  isDictationAvailable = true;
  await listenToEnd(dictation, "Đã nghe 1 lần");
  await dictation.getByLabel(DICTATION.prompt).fill("わたしはがくせいでした");
  await dictation.getByRole("button", { name: "Kiểm tra câu này", exact: true }).click();
  await expect(dictation.locator(".answer-feedback")).toContainText("Chưa đúng.");
  await expect(dictation.locator(".answer-feedback")).toContainText(DICTATION.answer);
  await expect(dictation.locator(".transcript")).toContainText(DICTATION.transcript);
});

test("practice assignments keep listen counts and the report flags weak listening", async ({
  browser,
}) => {
  await createConfirmedStudent(learner.email, learner.password, learner.name);
  const teacher = await newSignedInPage(browser, TEACHER.email, TEACHER.password);
  await teacher.goto("/teach/classes");
  await teacher.getByLabel("Tên lớp", { exact: true }).fill(`Lớp nghe ${RUN_ID}`);
  await teacher.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await teacher.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);
  const classId = teacher.url().split("/").at(-1) ?? "";
  const code = ((await teacher.locator(".join-code").textContent()) ?? "").replace("-", "");
  await teacher.goto(`/teach/classes/${classId}/assign`);
  await teacher.locator("#class-lesson").selectOption(LESSON_ID);
  await teacher.getByRole("button", { name: "Lưu vào lớp", exact: true }).click();
  await expect(teacher.getByText("Đã cập nhật nội dung lớp.")).toBeVisible();
  await teacher.getByLabel("Tiêu đề", { exact: true }).fill(ASSIGNMENT_TITLE);
  const listenOption = teacher.locator("label.choice-option").filter({ hasText: LISTEN.prompt });
  await expect(listenOption).toContainText("nghe, 1 điểm");
  await listenOption.getByRole("checkbox").check();
  const dictationOption = teacher
    .locator("label.choice-option")
    .filter({ hasText: DICTATION.prompt });
  await expect(dictationOption).toContainText("chính tả, 1 điểm");
  await dictationOption.getByRole("checkbox").check();
  await teacher.getByRole("button", { name: "Xem lại và xuất bản", exact: true }).click();
  await teacher.getByRole("button", { name: "Xuất bản bài giao", exact: true }).click();
  await teacher.waitForURL(/\/teach\/classes\/[0-9a-f-]{36}$/);

  const student = await newSignedInPage(browser, learner.email, learner.password);
  await serveAudio(student, SHORT_MP3);
  await student.goto("/join-class");
  await student.getByLabel("Mã lớp", { exact: true }).fill(code);
  await student.getByRole("button", { name: "Vào lớp", exact: true }).click();
  await student.waitForURL(`**/classes/${classId}`);
  await student.getByRole("link", { name: ASSIGNMENT_TITLE, exact: true }).click();
  await student.getByRole("button", { name: "Bắt đầu làm bài", exact: true }).click();
  const listen = student.locator(".question-card").nth(0);
  await listenToEnd(listen, "Đã nghe 1 lần / tối đa 2");
  await listen.getByRole("radio", { name: "がっこう", exact: true }).check();
  const dictation = student.locator(".question-card").nth(1);
  for (let play = 1; play <= 6; play++) {
    await listenToEnd(dictation, `Đã nghe ${play} lần`);
  }
  await dictation.getByLabel(DICTATION.prompt).fill(DICTATION.answer);
  await expect(student.locator(".save-status")).toContainText("Đã lưu", { timeout: 10_000 });
  await student.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await student.getByRole("button", { name: "Xác nhận nộp", exact: true }).click();
  await student.waitForURL(/\/results$/);
  await expect(student.locator(".result-score")).toContainText("100%");
  await expect(student.locator(".transcript")).toHaveText([
    `Transcript: ${LISTEN.transcript} (bạn đã nghe 1 lần)`,
    `Transcript: ${DICTATION.transcript} (bạn đã nghe 6 lần)`,
  ]);

  await teacher.goto(`/teach/classes/${classId}`);
  const row = teacher.getByRole("row", { name: new RegExp(learner.name) });
  await expect(row).toContainText("3.5");
  await expect(row).toContainText("Yếu phần nghe");
  await row.getByRole("link", { name: learner.name }).click();
  await expect(teacher.getByText("nghe trung bình 3.5 lần mỗi câu nghe")).toBeVisible();
  await expect(teacher.getByText("; nghe 6 lần")).toBeVisible();
  await teacher.context().close();
  await student.context().close();
});

test("the listening page fits a 360px screen", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await context.newPage();
  await serveAudio(page, SHORT_MP3);
  await page.goto(`/listening/${LESSON_ID}`);
  await expect(page.getByTestId("listen-count").first()).toBeVisible();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
  await page.screenshot({ path: "test-results/listening-mobile.png", fullPage: true });
  await context.close();
});
