import assert from "node:assert/strict";
import { test } from "node:test";

import { classSettingsSchema } from "../lib/class-settings";

test("class settings keep optional capacity and restrict meeting links to real Meet paths", () => {
  const input = {
    name: "Tiếng Trung",
    passScore: 70,
    capacity: "10",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    languageTag: "zh-Hans",
  };
  assert.equal(classSettingsSchema.parse(input).capacity, 10);
  assert.equal(
    classSettingsSchema.parse({ ...input, capacity: "", meetingUrl: "" }).capacity,
    null,
  );
  for (const capacity of [0, -1, 1.5, 1001]) {
    assert.equal(classSettingsSchema.safeParse({ ...input, capacity }).success, false);
  }
  for (const meetingUrl of [
    "javascript:alert(1)",
    "https://meet.google.com.evil.example/abc-defg-hij",
    "https://user@meet.google.com/abc-defg-hij",
    "http://meet.google.com/abc-defg-hij",
  ]) {
    assert.equal(classSettingsSchema.safeParse({ ...input, meetingUrl }).success, false);
  }
});
