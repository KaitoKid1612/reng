import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import ts from "typescript";

import kana from "../content/kana.json";
import { kanaSchema } from "../lib/kana";

import type { Page, Route } from "@playwright/test";
import type { AudioPlayer, AudioPlayerOptions, AudioPlayerState } from "../lib/audio-player";

declare global {
  interface Window {
    testAudioPlayer: AudioPlayer;
    testAudioStates: AudioPlayerState[];
    testPausedSources: string[];
  }
}

const FIRST_HASH = "a".repeat(32);
const SECOND_HASH = "b".repeat(32);
const audioItems = kanaSchema.parse(kana).items.slice(0, 2);

// MPEG-1 Layer III frames with zero side information decode as silence.
// This fixture checks browser decoding, not Japanese pronunciation quality.
const SILENT_MP3 = Buffer.alloc(417 * 20);

for (let frame = 0; frame < 20; frame++) {
  SILENT_MP3.set([0xff, 0xfb, 0x90, 0xc0], frame * 417);
}

async function installPlayer(page: Page) {
  const source = await readFile("lib/audio-player.ts", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;

  await page.goto("/");
  await page.evaluate(
    async ({ compiled, firstHash, secondHash }) => {
      const moduleUrl = URL.createObjectURL(new Blob([compiled], { type: "text/javascript" }));
      const audioModule = (await import(moduleUrl)) as {
        createAudioPlayer: (options: AudioPlayerOptions) => AudioPlayer;
      };

      URL.revokeObjectURL(moduleUrl);
      window.testAudioStates = [];
      window.testPausedSources = [];

      const originalPause = HTMLMediaElement.prototype.pause;
      HTMLMediaElement.prototype.pause = function () {
        window.testPausedSources.push(this.src);
        originalPause.call(this);
      };

      window.testAudioPlayer = audioModule.createAudioPlayer({
        assets: { "h-a": firstHash, "h-i": secondHash },
        baseUrl: "/audio/kana",
        onStateChange: (state) => window.testAudioStates.push(state),
      });
    },
    { compiled, firstHash: FIRST_HASH, secondHash: SECOND_HASH },
  );
}

async function playItem(page: Page, index = 0) {
  await page.evaluate((item) => window.testAudioPlayer.play(item), audioItems[index]);
}

function latestState(page: Page) {
  return page.evaluate(() => window.testAudioStates.at(-1));
}

test("decodes an MP3 and reports playing and completion", async ({ page }) => {
  await page.route("**/audio/kana/*.mp3", (route) =>
    route.fulfill({ contentType: "audio/mpeg", body: SILENT_MP3 }),
  );
  await installPlayer(page);
  await playItem(page);

  await expect.poll(() => latestState(page)).toMatchObject({ status: "done", itemId: "h-a" });
  expect(await page.evaluate(() => window.testAudioStates.map((state) => state.status))).toEqual([
    "loading",
    "playing",
    "done",
  ]);
});

test("reports a missing MP3 and allows an explicit retry", async ({ page }) => {
  let attempts = 0;

  await page.route("**/audio/kana/*.mp3", (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({ status: 404, body: "Not found" })
      : route.fulfill({ contentType: "audio/mpeg", body: SILENT_MP3 });
  });
  await installPlayer(page);
  await playItem(page);
  await expect.poll(() => latestState(page)).toMatchObject({ status: "error", itemId: "h-a" });

  await playItem(page);
  await expect.poll(() => latestState(page)).toMatchObject({ status: "done", itemId: "h-a" });
  expect(attempts).toBe(2);
});

test("times out stalled audio without reporting completion", async ({ page }) => {
  await page.route("**/audio/kana/*.mp3", () => {});
  await installPlayer(page);
  await page.clock.install();
  await playItem(page);
  await page.clock.fastForward(10001);

  await expect.poll(() => latestState(page)).toMatchObject({ status: "error", itemId: "h-a" });
  expect(
    await page.evaluate(() => window.testAudioStates.some((state) => state.status === "done")),
  ).toBe(false);
});

test("switching characters cancels the previous request and its timeout", async ({ page }) => {
  let pendingRoute: Route | undefined;

  await page.route(`**/${FIRST_HASH}.mp3`, (route) => {
    pendingRoute = route;
  });
  await page.route(`**/${SECOND_HASH}.mp3`, (route) =>
    route.fulfill({ contentType: "audio/mpeg", body: SILENT_MP3 }),
  );
  await installPlayer(page);
  await page.clock.install();
  await playItem(page);
  await expect.poll(() => Boolean(pendingRoute)).toBe(true);
  await playItem(page, 1);
  await expect.poll(() => latestState(page)).toMatchObject({ status: "done", itemId: "h-i" });
  await page.clock.fastForward(10001);

  await expect.poll(() => latestState(page)).toMatchObject({ status: "done", itemId: "h-i" });
  expect(
    await page.evaluate(
      (hash) => window.testPausedSources.some((source) => source.includes(hash)),
      FIRST_HASH,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      window.testAudioStates.some((state) => state.itemId === "h-a" && state.status === "done"),
    ),
  ).toBe(false);
});

test("disposing a player cancels playback and ignores future play calls", async ({ page }) => {
  await page.route("**/audio/kana/*.mp3", () => {});
  await installPlayer(page);
  await page.clock.install();
  await playItem(page);
  await page.evaluate(() => window.testAudioPlayer.dispose());
  const stateCount = await page.evaluate(() => window.testAudioStates.length);

  await playItem(page, 1);
  await page.clock.fastForward(10001);
  expect(await page.evaluate(() => window.testAudioStates.length)).toBe(stateCount);
});

test("returning to the chart resets feedback from the previous route", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      value: { getVoices: () => [], addEventListener() {}, removeEventListener() {}, cancel() {} },
    });
  });
  await page.goto("/kana");
  await page.getByRole("button", { name: "あ, a", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("chưa có giọng Nhật");
  await page.getByRole("link", { name: "Luyện tập", exact: true }).click();
  await expect(page).toHaveURL(/\/kana\/practice$/);
  await page.getByRole("link", { name: "Bảng chữ cái", exact: true }).click();
  await expect(page).toHaveURL(/\/kana$/);
  await expect(page.getByRole("status")).toContainText("Chọn một chữ để nghe cách đọc.");
});

test("waits for Japanese device voices and completes fallback playback", async ({ page }) => {
  await page.addInitScript(() => {
    class DeviceUtterance {
      voice: unknown = null;
      lang = "";
      rate = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
    }

    let isReady = false;
    const speech = Object.assign(new EventTarget(), {
      getVoices() {
        if (!isReady) {
          window.setTimeout(() => {
            isReady = true;
            speech.dispatchEvent(new Event("voiceschanged"));
          }, 50);
          return [];
        }

        return [{ lang: "ja-JP" }];
      },
      speak(utterance: DeviceUtterance) {
        utterance.onstart?.();
        window.setTimeout(() => utterance.onend?.(), 20);
      },
      cancel() {},
    });

    Object.defineProperty(window, "speechSynthesis", { value: speech });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: DeviceUtterance });
  });
  await page.goto("/kana");
  await page.getByRole("button", { name: "あ, a", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã phát bằng giọng Nhật của thiết bị");
});

test("reports synchronous device speech errors without an uncaught page error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.addInitScript(() => {
    class DeviceUtterance {
      voice: unknown = null;
      lang = "";
      rate = 1;
    }

    const speech = Object.assign(new EventTarget(), {
      getVoices: () => [{ lang: "ja-JP" }],
      cancel() {},
      speak() {
        throw new Error("Device speech unavailable");
      },
    });

    Object.defineProperty(window, "speechSynthesis", { value: speech });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: DeviceUtterance });
  });
  await page.goto("/kana");
  await page.getByRole("button", { name: "あ, a", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Giọng thiết bị chưa phát được");
  expect(errors).toEqual([]);
});
