import assert from "node:assert/strict";
import { test } from "node:test";

import { joinMp3, mp3DurationMs, readMp3Frames } from "../lib/audio-mp3";

// MPEG-2 Layer III, 64 kbps, 24 kHz, mono (192-byte frames), the format Unreal Speech returns.
function frame(fill: number, header = [0xff, 0xf3, 0x84, 0xc4], size = 192) {
  const bytes = new Uint8Array(size).fill(fill);
  bytes.set(header);
  return bytes;
}

function concat(...parts: Uint8Array[]) {
  const joined = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

// An ID3v2 header announcing a 34-byte tag body.
const id3 = concat(new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 34]), new Uint8Array(34));

function infoFrame() {
  const bytes = frame(0);
  // Mono MPEG-2: 9 bytes of side information, then the tag.
  bytes.set([0x49, 0x6e, 0x66, 0x6f], 4 + 9);
  return bytes;
}

test("MP3 frames are read after an ID3 tag, with their playing time", () => {
  const file = concat(id3, frame(1), frame(2), frame(3));
  const frames = readMp3Frames(file);
  assert.deepEqual(
    frames.map((item) => [item.offset, item.length, item.sampleRate]),
    [
      [44, 192, 24000],
      [236, 192, 24000],
      [428, 192, 24000],
    ],
  );
  // 576 samples per MPEG-2 frame at 24 kHz is 24 ms.
  assert.equal(mp3DurationMs(file), 72);
});

test("joining drops tags and info frames and keeps every audio frame in order", () => {
  const first = concat(id3, infoFrame(), frame(1), frame(1));
  const second = concat(id3, frame(2));
  const joined = joinMp3([first, second]);
  assert.equal(joined.length, 3 * 192);
  assert.deepEqual([joined[100], joined[300], joined[500]], [1, 1, 2]);
  assert.equal(readMp3Frames(joined).length, 3);
});

test("parts that are not MP3, are cut off or differ in format are refused", () => {
  assert.throws(() => joinMp3([new Uint8Array([1, 2, 3, 4, 5])]), /Not an MP3 frame/);
  assert.throws(() => joinMp3([frame(1).subarray(0, 100)]), /cut off/);
  // A 22.05 kHz frame (208 bytes at 64 kbps) cannot follow a 24 kHz one.
  assert.throws(
    () => joinMp3([frame(1), frame(2, [0xff, 0xf3, 0x80, 0xc4], 208)]),
    /differ in version, sample rate or channels/,
  );
  assert.throws(() => joinMp3([id3]), /no audio frames/);
});
