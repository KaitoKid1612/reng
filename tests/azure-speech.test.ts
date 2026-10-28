import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicalAudio } from "../lib/audio-config";
import { synthesizeSpeech } from "../lib/azure-speech";

const AZURE_OPTIONS = { region: "test-region", key: "test-key" };

test("retries 429 and server failures with bounded delays before returning audio", async () => {
  let attempts = 0;
  const waits: number[] = [];
  const bytes = await synthesizeSpeech(canonicalAudio("あ"), {
    ...AZURE_OPTIONS,
    wait: async (milliseconds) => {
      waits.push(milliseconds);
    },
    fetcher: async (_url, options) => {
      assert.ok(options?.signal);
      attempts++;

      if (attempts === 1) {
        return new Response("Rate limited", { status: 429, headers: { "retry-after": "100" } });
      }

      if (attempts === 2) {
        return new Response("Unavailable", { status: 503 });
      }

      return new Response("audio".repeat(40));
    },
  });

  assert.equal(attempts, 3);
  assert.deepEqual(waits, [10000, 2000]);
  assert.equal(bytes.length, 200);
});

test("authentication failures are not retried or logged with response contents", async () => {
  let attempts = 0;

  await assert.rejects(
    synthesizeSpeech(canonicalAudio("あ"), {
      ...AZURE_OPTIONS,
      fetcher: async () => {
        attempts++;
        return new Response("sensitive-response", { status: 401 });
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /HTTP 401/);
      assert.equal(error.message.includes("sensitive-response"), false);
      assert.equal(error.message.includes(AZURE_OPTIONS.key), false);
      return true;
    },
  );
  assert.equal(attempts, 1);
});

test("server failures stop after three attempts", async () => {
  let attempts = 0;

  await assert.rejects(
    synthesizeSpeech(canonicalAudio("あ"), {
      ...AZURE_OPTIONS,
      wait: async () => {},
      fetcher: async () => {
        attempts++;
        return new Response("Unavailable", { status: 500 });
      },
    }),
    /HTTP 500/,
  );
  assert.equal(attempts, 3);
});

test("short or empty successful responses are rejected", async () => {
  await assert.rejects(
    synthesizeSpeech(canonicalAudio("あ"), {
      ...AZURE_OPTIONS,
      fetcher: async () => new Response(""),
    }),
    /empty or unexpectedly short audio/,
  );
});

test("network timeouts propagate without unbounded retries", async () => {
  let attempts = 0;

  await assert.rejects(
    synthesizeSpeech(canonicalAudio("あ"), {
      ...AZURE_OPTIONS,
      fetcher: async () => {
        attempts++;
        throw new DOMException("Timed out", "TimeoutError");
      },
    }),
    /Timed out/,
  );
  assert.equal(attempts, 1);
});
