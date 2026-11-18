import assert from "node:assert/strict";
import { test } from "node:test";

import {
  followsHanVietRule,
  hanVietRuleOf,
  plainHanViet,
  summarizeHanVietRules,
} from "@/lib/han-viet-rules";
import { KANJI_LEVEL_DATA } from "@/lib/kanji-data";

const items = [...KANJI_LEVEL_DATA.n5.items, ...KANJI_LEVEL_DATA.n4.items];

test("a Hán Việt reading is read without tone marks, keeping đ apart from d", () => {
  assert.equal(plainHanViet("Trường / Trưởng"), "truong");
  assert.equal(plainHanViet("Đông"), "đong");
  assert.equal(plainHanViet("Lạc, Nhạc"), "lac");
  assert.equal(hanVietRuleOf("Học", "ending")?.id, "c");
  assert.equal(hanVietRuleOf("Học", "start")?.id, "h");
  assert.equal(hanVietRuleOf("Đông", "start")?.id, "dd");
  assert.equal(hanVietRuleOf("Thiên", "start")?.id, "th");
  assert.equal(hanVietRuleOf("Tam", "start")?.id, "t");
  assert.equal(hanVietRuleOf("Cao", "ending")?.id, "vu");
  const rule = hanVietRuleOf("Nhật", "ending");
  assert.ok(rule && followsHanVietRule({ on: ["ニチ", "ジツ"] }, rule));
  // A one-syllable on reading has no final consonant (池 チ).
  const vowel = hanVietRuleOf("Trì", "ending");
  assert.ok(vowel && followsHanVietRule({ on: ["チ"] }, vowel));
});

test("every N5/N4 kanji with an on reading has an ending rule, and the endings mostly hold", () => {
  const withOn = items.filter((item) => item.on.length);
  assert.deepEqual(
    withOn.filter((item) => !hanVietRuleOf(item.hanViet, "ending")).map((item) => item.kanji),
    [],
  );
  for (const { rule, followers, exceptions } of summarizeHanVietRules(items)) {
    const total = followers.length + exceptions.length;
    if (total) {
      // The page lists every exception; a rule that holds on less than 3 in 4 is not a rule.
      assert.ok(
        followers.length / total >= 0.75,
        `${rule.part} ${rule.id} ${followers.length}/${total}`,
      );
    }
  }
});
