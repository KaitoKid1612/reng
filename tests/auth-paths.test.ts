import assert from "node:assert/strict";
import { test } from "node:test";

import { safeNextPath } from "../lib/auth-paths";

test("keeps same-site paths with their query and hash", () => {
  assert.equal(safeNextPath("/classes", "/"), "/classes");
  assert.equal(safeNextPath("/join-class?code=ABCD2345", "/"), "/join-class?code=ABCD2345");
  assert.equal(
    safeNextPath("/lessons/lesson-01/presenter?version=1#3", "/"),
    "/lessons/lesson-01/presenter?version=1#3",
  );
});

test("rejects destinations a browser would resolve to another site", () => {
  for (const value of [
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example/login",
    "/\n/evil.example",
    "/\r/evil.example",
    "https://evil.example",
    "evil.example",
    "",
    null,
    ["/classes"],
    `/${"a".repeat(300)}`,
  ]) {
    assert.equal(safeNextPath(value, "/fallback"), "/fallback", JSON.stringify(value));
  }
});
