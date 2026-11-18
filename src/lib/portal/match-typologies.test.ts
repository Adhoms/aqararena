import assert from "node:assert/strict";
import { test } from "node:test";
import { matchTypologies } from "./match-typologies";

const live = [
  { id: "t1", code: "A" },
  { id: "t2", code: "B" },
];

test("a renamed unit type stays the same live type", () => {
  const m = matchTypologies(live, [
    { code: "A-NEW", liveId: "t1" },
    { code: "B", liveId: "t2" },
  ]);
  assert.deepEqual([...m.entries()], [
    [0, "t1"],
    [1, "t2"],
  ]);
});

test("rows from older drafts (no live id) still match by code", () => {
  const m = matchTypologies(live, [
    { code: "b", liveId: null },
    { code: "C", liveId: null },
  ]);
  assert.deepEqual([...m.entries()], [[0, "t2"]]);
});

test("two types can swap codes", () => {
  const m = matchTypologies(live, [
    { code: "B", liveId: "t1" },
    { code: "A", liveId: "t2" },
  ]);
  assert.equal(m.get(0), "t1");
  assert.equal(m.get(1), "t2");
});

test("a live type is used once, and an id from another project is ignored", () => {
  const m = matchTypologies(live, [
    { code: "A", liveId: "t1" },
    { code: "A2", liveId: "t1" },
    { code: "Z", liveId: "other-project" },
  ]);
  assert.equal(m.get(0), "t1");
  assert.equal(m.has(1), false);
  assert.equal(m.has(2), false);
});
