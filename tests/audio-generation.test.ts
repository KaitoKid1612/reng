import assert from "node:assert/strict";
import { test } from "node:test";

import { audioHash, canonicalAudio } from "../lib/audio-config";
import { generateAudioAssets } from "../lib/audio-generation";

import type { AudioGenerationOptions, AudioManifest } from "../lib/audio-generation";

function createFixture() {
  const config = canonicalAudio("あ");
  const asset = { itemId: "h-a", hash: audioHash(config), config };
  const files = new Map<string, Uint8Array>();
  const saved: AudioManifest[] = [];
  const calls = { synthesize: 0, write: 0, metadata: 0 };
  const options: AudioGenerationOptions = {
    plan: [asset],
    manifest: { schemaVersion: 1, assets: {} },
    store: {
      exists: async (hash) => files.has(hash),
      async write(hash, bytes) {
        calls.write++;
        files.set(hash, bytes);
      },
    },
    async synthesize() {
      calls.synthesize++;
      return new Uint8Array(200);
    },
    async syncMetadata() {
      calls.metadata++;
    },
    async saveManifest(manifest) {
      saved.push(manifest);
    },
  };

  return { asset, options, files, saved, calls };
}

test("generates an asset once and reuses it on the next run", async () => {
  const fixture = createFixture();
  const first = await generateAudioAssets(fixture.options);
  const second = await generateAudioAssets({ ...fixture.options, manifest: first.manifest });

  assert.equal(first.createdCount, 1);
  assert.equal(second.createdCount, 0);
  assert.equal(fixture.calls.synthesize, 1);
  assert.equal(fixture.calls.write, 1);
  assert.equal(fixture.calls.metadata, 2);
  assert.deepEqual(fixture.options.manifest.assets, {}, "the caller's manifest remains unchanged");
  assert.equal(second.manifest.assets[fixture.asset.itemId], fixture.asset.hash);
});

test("an asset inspection failure stops before TTS or manifest persistence", async () => {
  const fixture = createFixture();
  fixture.options.store.exists = async () => {
    throw new Error("Access denied");
  };

  await assert.rejects(generateAudioAssets(fixture.options), /Access denied/);
  assert.equal(fixture.calls.synthesize, 0);
  assert.equal(fixture.calls.write, 0);
  assert.equal(fixture.saved.length, 0);
});

test("upload failure never publishes metadata or manifest entries", async () => {
  const fixture = createFixture();
  fixture.options.store.write = async () => {
    throw new Error("Upload unavailable");
  };

  await assert.rejects(generateAudioAssets(fixture.options), /Upload unavailable/);
  assert.equal(fixture.calls.metadata, 0);
  assert.equal(fixture.saved.length, 0);
});

test("retrying after metadata failure reuses the uploaded asset", async () => {
  const fixture = createFixture();

  await assert.rejects(
    generateAudioAssets({
      ...fixture.options,
      syncMetadata: async () => {
        throw new Error("Metadata unavailable");
      },
    }),
    /Metadata unavailable/,
  );
  assert.equal(fixture.saved.length, 0);
  assert.ok(fixture.files.has(fixture.asset.hash));

  const result = await generateAudioAssets(fixture.options);
  assert.equal(result.createdCount, 0);
  assert.equal(fixture.calls.synthesize, 1);
  assert.equal(fixture.saved.length, 1);
});

test("retrying after manifest persistence failure does not regenerate audio", async () => {
  const fixture = createFixture();

  await assert.rejects(
    generateAudioAssets({
      ...fixture.options,
      saveManifest: async () => {
        throw new Error("Disk unavailable");
      },
    }),
    /Disk unavailable/,
  );
  assert.deepEqual(fixture.options.manifest.assets, {});

  const result = await generateAudioAssets(fixture.options);
  assert.equal(result.createdCount, 0);
  assert.equal(fixture.calls.synthesize, 1);
  assert.equal(result.manifest.assets[fixture.asset.itemId], fixture.asset.hash);
});
