import assert from "node:assert/strict";
import { test } from "node:test";

import { audioHash, canonicalAudio } from "../lib/audio-config";
import { synthesizeUnrealSpeech } from "../lib/unreal-speech";

const TEXT = "かいぎしつは さんがいです。";

test("Unreal voices get their own hashes and leave Azure hashes unchanged", () => {
  const azure = canonicalAudio(TEXT, "ja-JP-NanamiNeural");
  const unreal = canonicalAudio(TEXT, "unreal:Sakura");
  assert.equal(audioHash(azure), "84f2d79ce7c073b85fdccb7890dd492f");
  assert.equal(unreal.locale, "ja-JP");
  assert.notEqual(audioHash(unreal), audioHash(azure));
  assert.notEqual(audioHash(unreal), audioHash(canonicalAudio(TEXT, "unreal:Haruto")));
  // Only the Japanese voices are accepted, so a file never claims the wrong language.
  assert.throws(() => canonicalAudio(TEXT, "unreal:Scarlett"), /Unreal voice must be one of/);
});

test("Unreal Speech sends the text and voice, retries busy answers and keeps the key private", async () => {
  const waits: number[] = [];
  let attempts = 0;
  let body: Record<string, string> = {};
  const bytes = await synthesizeUnrealSpeech(canonicalAudio(TEXT, "unreal:Sakura"), {
    key: "secret-key",
    wait: async (milliseconds) => {
      waits.push(milliseconds);
    },
    fetcher: async (url, options) => {
      attempts++;
      assert.equal(url, "https://api.v8.unrealspeech.com/stream");
      assert.equal(new Headers(options?.headers).get("authorization"), "Bearer secret-key");
      body = JSON.parse(String(options?.body));
      if (attempts === 1) {
        return new Response("Too many requests", { status: 429 });
      }
      return new Response("audio".repeat(40), { headers: { "content-type": "audio/mpeg" } });
    },
  });
  assert.equal(bytes.length, 200);
  assert.deepEqual(waits, [1000]);
  assert.equal(body.Text, TEXT);
  assert.equal(body.VoiceId, "Sakura");
  assert.equal(body.Bitrate, "64k");

  await assert.rejects(
    synthesizeUnrealSpeech(canonicalAudio(TEXT, "unreal:Sakura"), {
      key: "secret-key",
      fetcher: async () => new Response('Invalid "VoiceId" value.', { status: 400 }),
    }),
    (error: Error) => error.message.includes("(400)") && !error.message.includes("secret-key"),
  );
});
