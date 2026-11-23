import assert from "node:assert/strict";
import { test } from "node:test";
import { asSnapshot, SNAPSHOT_VERSION } from "./offer-snapshot";

test("a stored snapshot is read back only when it has this version's shape", () => {
  const good = { v: SNAPSHOT_VERSION, listPrice: 1, price: 1, schedule: { rows: [] }, plan: { fingerprint: "x" }, unit: {}, project: {}, developer: {}, salesperson: {}, client: {} };
  assert.equal(asSnapshot(good), good);
  for (const bad of [null, 1, "x", {}, { ...good, v: 2 }, { ...good, schedule: null }]) assert.equal(asSnapshot(bad), null);
});
