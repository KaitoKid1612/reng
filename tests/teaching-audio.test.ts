import assert from "node:assert/strict";
import { test } from "node:test";

import { audioHash, canonicalAudio } from "../lib/audio-config";
import { applyTeachingAudio, planTeachingAudio } from "../lib/teaching-audio";
import { createTeachingDraft } from "../lib/teaching-content";
import { teachingReducer } from "../lib/teaching-draft";
import { parseVocabularyTable } from "../lib/teaching-table";

test("Japanese audio keeps its configuration and hash; Chinese voices read their own script", () => {
  // Existing Japanese files are found by this hash, so the configuration must not change.
  assert.deepEqual(canonicalAudio("あ"), {
    text: "あ",
    locale: "ja-JP",
    voice: "ja-JP-NanamiNeural",
    rate: "0%",
    pitch: "0%",
    format: "audio-16khz-64kbitrate-mono-mp3",
    pipelineVersion: 1,
  });
  assert.equal(canonicalAudio("你好", "zh-CN-XiaoxiaoNeural").locale, "zh-CN");
  assert.equal(canonicalAudio("你好", "zh-TW-HsiaoChenNeural").locale, "zh-TW");
  assert.notEqual(
    audioHash(canonicalAudio("你好", "zh-CN-XiaoxiaoNeural")),
    audioHash(canonicalAudio("你好", "zh-TW-HsiaoChenNeural")),
  );
  assert.throws(() => canonicalAudio("안녕", "ko-KR-SunHiNeural"));
});

test("a Chinese lesson plans audio for its words and dialogue lines", () => {
  let draft = createTeachingDraft("Chào hỏi", "starter", "zh-Hant", "Chào");
  draft = teachingReducer(draft, {
    type: "addVocabRows",
    rows: parseVocabularyTable("你好\tnǐ hǎo\txin chào\n謝謝\txièxie\tcảm ơn", []).rows,
  });
  draft = teachingReducer(draft, { type: "addVocab" });
  draft = teachingReducer(draft, { type: "addDialogue" });
  const line = draft.content.dialogue[0];
  draft = teachingReducer(draft, {
    type: "updateDialogue",
    id: line.id,
    patch: { text: "你好！", reading: "Nǐ hǎo!", meaning: "Xin chào!" },
  });
  const plan = planTeachingAudio("lesson-a", draft.content);
  const [first, second] = draft.content.vocab;
  assert.deepEqual(
    plan.map((asset) => [asset.itemId, asset.config.text, asset.config.voice]),
    [
      [`lesson-a:vocab:${first.id}`, "你好", "zh-TW-HsiaoChenNeural"],
      [`lesson-a:vocab:${second.id}`, "謝謝", "zh-TW-HsiaoChenNeural"],
      [`lesson-a:dialogue:${line.id}`, "你好！", "zh-TW-HsiaoChenNeural"],
    ],
    "the blank word added last has no audio",
  );
  const assets = Object.fromEntries(plan.map((asset) => [asset.itemId, asset.hash]));
  const applied = applyTeachingAudio("lesson-a", draft.content, assets);
  assert.equal(applied.vocab[0].audio, plan[0].hash);
  assert.equal(applied.dialogue[0].audio, plan[2].hash);
  assert.equal(applied.vocab[2].audio, null);
  assert.equal(draft.content.vocab[0].audio, null, "the draft itself is not changed");
});
