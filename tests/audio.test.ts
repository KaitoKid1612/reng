import { test } from "node:test";
import assert from "node:assert/strict";

import { audioHash, canonicalAudio, ssml } from "../lib/audio-config";

test("hashes audio configuration consistently and changes the hash with voice or rate", () => {
  const config = canonicalAudio("あ");
  assert.match(audioHash(config), /^[a-f0-9]{32}$/);
  assert.equal(audioHash(config), audioHash({ ...config }));
  assert.notEqual(audioHash(config), audioHash({ ...config, voice: "ja-JP-KeitaNeural" }));
  assert.notEqual(audioHash(config), audioHash({ ...config, rate: "-25%" }));
  assert.throws(() => canonicalAudio("あ", "en-US-OtherNeural"));
});
test("escapes SSML content to prevent XML injection", () => {
  const xml = ssml(canonicalAudio('<break time="5s"/> &'));
  assert.ok(xml.includes("&lt;break"));
  assert.ok(xml.includes("&amp;"));
  assert.equal(xml.includes('<break time="5s"/>'), false);
});
