import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { dialogueSides } from "../lib/characters";
import { STARTER_LESSONS } from "../lib/starter-lessons";
import { VOCAB_ICONS, vocabIconPath } from "../lib/vocab-icons";

test("every curated vocabulary icon has a safe SVG file and a unique name", () => {
  assert.equal(new Set(VOCAB_ICONS.map((icon) => icon.name)).size, VOCAB_ICONS.length);
  for (const icon of VOCAB_ICONS) {
    const path = `public${vocabIconPath(icon.name)}`;
    assert.ok(existsSync(path), `${path} is missing`);
    assert.doesNotMatch(readFileSync(path, "utf8"), /<script|<foreignObject|javascript:/i);
  }
  assert.ok(existsSync("public/icons/vocab/LICENSE.txt"));
});

test("starter lessons only point at pictures that exist", () => {
  for (const starter of STARTER_LESSONS) {
    const pictures = starter.draft.content.vocab.flatMap((item) =>
      item.image ? [item.image] : [],
    );
    assert.ok(pictures.length > 0, `${starter.id} has no pictures`);
    for (const picture of pictures) {
      assert.ok(existsSync(`public${picture}`), `${starter.id}: ${picture} is missing`);
    }
  }
});

test("dialogue speakers alternate sides by order of first appearance", () => {
  assert.deepEqual(dialogueSides(["先生", "ナム", "先生", "ナム", "アン"]), [
    "start",
    "end",
    "start",
    "end",
    "start",
  ]);
});
