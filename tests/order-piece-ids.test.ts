import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

interface ContentQuestion {
  id: string;
  type: string;
  tokens?: { id: string }[];
  answer?: unknown;
}

// Piece IDs reach the browser with the shuffled pieces (lib/order-pieces.ts), so a numbered series
// such as q3926-1, q3926-2… in answer order would give the sentence away.
function revealsOrder(question: ContentQuestion) {
  const ids = Array.isArray(question.answer) ? question.answer.map(String) : [];
  const numbers = ids.map((id) => /^(.*)-(\d+)$/.exec(id));
  return (
    ids.length > 1 &&
    numbers.every((match) => match !== null) &&
    numbers.every((match) => match?.[1] === numbers[0]?.[1]) &&
    numbers.every(
      (match, index) => index === 0 || Number(match?.[2]) > Number(numbers[index - 1]?.[2]),
    )
  );
}

test("sentence-order pieces in committed content have IDs that do not give the answer away", async () => {
  const found: string[] = [];
  for (const folder of ["content/starters", "content/review-banks", "content/lessons"]) {
    for (const file of (await readdir(folder)).filter((name) => name.endsWith(".json"))) {
      const data = JSON.parse(await readFile(`${folder}/${file}`, "utf8")) as {
        content?: { questions?: ContentQuestion[] };
        questions?: ContentQuestion[];
      };
      const questions = data.content?.questions ?? data.questions ?? [];
      for (const question of questions) {
        if (question.type === "order" && revealsOrder(question)) {
          found.push(`${file}:${question.id}`);
        }
      }
    }
  }
  assert.deepEqual(found, []);
});
