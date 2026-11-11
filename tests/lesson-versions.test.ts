import assert from "node:assert/strict";
import { test } from "node:test";

import { versionChoices } from "../lib/lesson-versions";

const VERSIONS = [{ id: "v4" }, { id: "v3" }, { id: "v2" }, { id: "v1" }];

test("a version choice offers the newest version and the ones in use, older ones on request", () => {
  const usual = versionChoices(VERSIONS, ["v2", null, undefined], false);
  assert.deepEqual(
    usual.offered.map((version) => version.id),
    ["v4", "v2"],
  );
  assert.equal(usual.olderCount, 2);
  assert.equal(usual.newestId, "v4");

  const all = versionChoices(VERSIONS, ["v2"], true);
  assert.deepEqual(
    all.offered.map((version) => version.id),
    ["v4", "v3", "v2", "v1"],
  );
  assert.equal(all.olderCount, 2, "the count stays so the choice keeps its label");
});

test("a lesson with one version or none has no older versions to show", () => {
  assert.deepEqual(versionChoices([{ id: "v1" }], ["v1"], false), {
    offered: [{ id: "v1" }],
    olderCount: 0,
    newestId: "v1",
  });
  assert.deepEqual(versionChoices([], [undefined], false), {
    offered: [],
    olderCount: 0,
    newestId: undefined,
  });
});
