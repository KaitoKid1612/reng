import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

test("audio dry-run and missing credentials leave the manifest unchanged", () => {
  const before = readFileSync("content/audio-manifest.json", "utf8");
  const env = {
    ...process.env,
    AZURE_SPEECH_KEY: "",
    AZURE_SPEECH_REGION: "",
    AZURE_SPEECH_VOICE: "ja-JP-NanamiNeural",
  };
  const plan = spawnSync(process.execPath, ["--import", "tsx", "scripts/generate-audio.ts"], {
    env,
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, /Dry-run: 208 kana items/);
  const generate = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/generate-audio.ts", "--generate", "--local"],
    { env, encoding: "utf8", timeout: 15000 },
  );
  assert.equal(generate.status, 1);
  assert.match(generate.stderr, /Missing AZURE_SPEECH_KEY/);
  assert.equal(readFileSync("content/audio-manifest.json", "utf8"), before);
});
