import assert from "node:assert/strict";
import { test } from "node:test";

import { audioHash, canonicalAudio } from "../lib/audio-config";
import { synthesizeAsset } from "../lib/audio-generation";
import { planContentAudio } from "../lib/lesson-audio";
import { splitSpeakerTurns } from "../lib/listening-dialogue";

test("a labelled transcript splits into turns at each speaker label", () => {
  assert.deepEqual(
    splitSpeakerTurns("女：もうコピーしましたか。男：まだです。先にメールを送ります。"),
    [
      { speaker: "女", text: "もうコピーしましたか。" },
      { speaker: "男", text: "まだです。先にメールを送ります。" },
    ],
  );
  assert.deepEqual(splitSpeakerTurns("店員：いらっしゃいませ。お客様：着てみたいんですが……。"), [
    { speaker: "店員", text: "いらっしゃいませ。" },
    { speaker: "お客様", text: "着てみたいんですが……。" },
  ]);
  // A time such as 3：00 inside a turn is not a label.
  assert.deepEqual(splitSpeakerTurns("女：会議は午後3：00からです。"), [
    { speaker: "女", text: "会議は午後3：00からです。" },
  ]);
  assert.equal(splitSpeakerTurns("わたしは がくせいです。"), null);
  assert.throws(() => splitSpeakerTurns("女：。男："), /no words/);
});

const dialogueQuestion = {
  id: "q1",
  type: "listen" as const,
  prompt: "Người đàn ông sẽ làm gì trước?",
  points: 1,
  tags: [],
  explain: "…",
  responseType: "choice" as const,
  audio: null,
  transcript: "女：コピーしましたか。男：まだです。",
  maxListens: null,
  options: ["a", "b"],
  answer: [0],
};
const narrationQuestion = { ...dialogueQuestion, id: "q2", transcript: "あしたは 雨です。" };
const content = { vocab: [], grammar: [], questions: [dialogueQuestion, narrationQuestion] };

test("a set with speaker voices plans one dialogue per labelled transcript", () => {
  const voices = { 女: "unreal:Sakura", 男: "unreal:Haruto" };
  const [dialogue, narration] = planContentAudio("set", content, "unreal:Sakura", voices);
  assert.deepEqual(dialogue.config.segments, [
    { text: "コピーしましたか。", voice: "unreal:Sakura" },
    { text: "まだです。", voice: "unreal:Haruto" },
  ]);
  assert.equal(dialogue.config.voice, "unreal:Sakura+unreal:Haruto");
  // A narration keeps the single-voice hash it always had.
  assert.equal(narration.hash, audioHash(canonicalAudio("あしたは 雨です。", "unreal:Sakura")));
  // Without speaker voices, the labelled transcript is still one voice, as before dialogues.
  const [plain] = planContentAudio("set", content, "unreal:Sakura");
  assert.equal(plain.config.segments, undefined);
  assert.notEqual(plain.hash, dialogue.hash);
  // Another voice for a speaker is another recording.
  const [other] = planContentAudio("set", content, "unreal:Sakura", {
    ...voices,
    男: "unreal:Yuki",
  });
  assert.notEqual(other.hash, dialogue.hash);
  assert.throws(
    () => planContentAudio("set", content, "unreal:Sakura", { 女: "unreal:Sakura" }),
    /no voice for speaker 男/,
  );
  assert.throws(
    () =>
      planContentAudio("set", content, "unreal:Sakura", {
        女: "unreal:Sakura",
        男: "ja-JP-KeitaNeural",
      }),
    /one service/,
  );
});

// One MPEG-2 Layer III frame, 64 kbps, 24 kHz, mono: 192 bytes, as Unreal Speech returns them.
function frame(fill: number) {
  const bytes = new Uint8Array(192).fill(fill);
  bytes.set([0xff, 0xf3, 0x84, 0xc4]);
  return bytes;
}

test("a dialogue is synthesised turn by turn in each voice and joined into one MP3", async () => {
  const [dialogue] = planContentAudio("set", content, "unreal:Sakura", {
    女: "unreal:Sakura",
    男: "unreal:Haruto",
  });
  const requests: string[] = [];
  const bytes = await synthesizeAsset(dialogue.config, async (part) => {
    requests.push(`${part.voice}: ${part.text}`);
    return frame(part.voice === "unreal:Haruto" ? 2 : 1);
  });
  assert.deepEqual(requests, ["unreal:Sakura: コピーしましたか。", "unreal:Haruto: まだです。"]);
  assert.equal(bytes.length, 384);
  assert.equal(bytes[100], 1);
  assert.equal(bytes[300], 2);
});
