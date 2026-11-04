import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";

import { format, resolveConfig } from "prettier";

import { parseAssignableQuestion } from "../lib/assignment";
import { gradeQuestion } from "../lib/grading/grade";
import {
  draftContentSchema,
  findPublishProblems,
  parseLessonDraftState,
} from "../lib/lesson-draft";
import { lessonDraftSchema } from "../lib/lesson-schema";
import {
  applyListeningAudio,
  findListeningAudio,
  parseListeningSet,
  planListeningAudio,
} from "../lib/listening-set";

const FILE = "content/listening/minna-1-15.json";

async function readBank() {
  return JSON.parse(await readFile(FILE, "utf8")) as {
    id: string;
    title: string;
    titleJa: string;
    summary: string;
    order: number;
    courseId: string;
    content: { questions: Record<string, unknown>[] };
  };
}

test("the Minna 1–15 listening set is a valid draft with six questions per lesson", async () => {
  const bank = await readBank();
  const content = draftContentSchema.parse(bank.content);
  assert.equal(content.questions.length, 90);
  const perLesson = new Map<number, number>();
  for (const question of content.questions) {
    assert.ok(question.type === "listen" || question.type === "dictation", question.id);
    assert.ok(question.tags.includes("listening"), question.id);
    const lessonTag = question.tags.find((tag) => tag.startsWith("minna:"));
    const lesson = Number(lessonTag?.slice("minna:".length));
    assert.ok(lesson >= 1 && lesson <= 15, question.id);
    assert.ok(question.prompt.startsWith(`(Bài ${lesson}) `), question.id);
    perLesson.set(lesson, (perLesson.get(lesson) ?? 0) + 1);
  }
  assert.deepEqual([...perLesson.values()], Array(15).fill(6));
});

test("dictation answers are the transcript in kana, so typing what is heard is right", async () => {
  const bank = await readBank();
  for (const question of draftContentSchema.parse(bank.content).questions) {
    if (question.type !== "dictation") {
      continue;
    }
    assert.equal(question.inputMode, "hiragana", question.id);
    assert.match(question.transcript, /^[ぁ-ゖー\s、。]+$/u, question.id);
    for (const answer of question.answer) {
      assert.match(answer, /^[ぁ-ゖー\s、。]+$/u, `${question.id}: ${answer}`);
    }
  }
});

test("once audio exists every question publishes, can be assigned and grades its own key", async () => {
  const bank = await readBank();
  const withAudio = {
    ...bank,
    content: {
      ...bank.content,
      questions: bank.content.questions.map((question, index) => ({
        ...question,
        audio: index.toString(16).padStart(32, "0"),
      })),
    },
  };
  const published = lessonDraftSchema.parse(withAudio);
  for (const raw of published.content.questions) {
    const question = parseAssignableQuestion(raw);
    assert.ok(question.type === "listen" || question.type === "dictation");
    let key;
    if (question.type === "dictation") {
      key = question.transcript;
    } else if (question.responseType === "choice") {
      key = question.answer.filter((item): item is number => typeof item === "number");
    } else {
      key = String(question.answer[0]);
    }
    assert.equal(gradeQuestion(question, key).isCorrect, true, question.id);
  }
});

test("without audio the editor blocks publishing, as the audio policy requires", async () => {
  const bank = await readBank();
  const state = parseLessonDraftState({
    metadata: {
      title: bank.title,
      titleJa: bank.titleJa,
      summary: bank.summary,
      order: bank.order,
      courseId: bank.courseId,
    },
    content: bank.content,
  });
  // One line for the whole set rather than the same sentence 90 times.
  const missingAudio = findPublishProblems(state).filter((problem) =>
    problem.message.includes("chưa có audio"),
  );
  assert.equal(missingAudio.length, 1);
  assert.match(missingAudio[0].message, /^Câu luyện 1–90: 90 câu nghe chưa có audio/);
});

test("generated audio is written back as hashes that match each transcript", async () => {
  const set = parseListeningSet(await readBank());
  const plan = planListeningAudio(set);
  assert.equal(plan.length, 90);
  const assets = Object.fromEntries(plan.map((asset) => [asset.itemId, asset.hash]));
  const withAudio = applyListeningAudio(set, assets);
  // The script writes the file through Prettier, so it still passes the format check.
  const path = FILE;
  const formatted = await format(JSON.stringify(withAudio), {
    ...(await resolveConfig(path)),
    filepath: path,
  });
  const reread = parseListeningSet(JSON.parse(formatted));
  assert.equal(findListeningAudio(reread).assets.length, 90);
  // A transcript edited after its audio was made needs new audio.
  const [first] = reread.content.questions;
  assert.ok(first.type === "listen" || first.type === "dictation");
  first.transcript = `${first.transcript} もう いちど。`;
  assert.deepEqual(findListeningAudio(reread).stale, [first.id]);
});

test("audio recorded in the committed set matches its transcript and ships as a file", async () => {
  const set = parseListeningSet(await readBank());
  const { assets, stale } = findListeningAudio(set);
  assert.deepEqual(stale, []);
  for (const asset of assets) {
    const file = await stat(`public/audio/lessons/${asset.hash}.mp3`);
    assert.ok(file.size > 100, asset.itemId);
  }
});
