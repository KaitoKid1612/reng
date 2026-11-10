import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { mp3DurationMs } from "../lib/audio-mp3";
import {
  findListeningAudio,
  LISTENING_AUDIO_FOLDER,
  parseListeningSet,
} from "../lib/listening-set";

const SET_FOLDER = "content/listening";

for (const file of readdirSync(SET_FOLDER).filter((name) => name.endsWith(".json"))) {
  test(`${file}: every question has audio that matches its transcript and plays`, async () => {
    const set = parseListeningSet(JSON.parse(await readFile(`${SET_FOLDER}/${file}`, "utf8")));
    const audio = findListeningAudio(set);
    assert.deepEqual(audio.missing, [], "questions without audio");
    assert.deepEqual(audio.stale, [], "audio made from another transcript or voice");
    for (const asset of audio.assets) {
      const bytes = new Uint8Array(
        await readFile(`public/${LISTENING_AUDIO_FOLDER}/${asset.hash}.mp3`),
      );
      // A listening question is a sentence or a short conversation, not a click or a lecture.
      const seconds = mp3DurationMs(bytes) / 1000;
      assert.ok(seconds > 1 && seconds < 60, `${asset.itemId} lasts ${seconds} s`);
    }
  });
}
