import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldNotify, unitKey, unitPriceProblem } from "./unit-rules";

test("a unit can't be priced under its type's starting price", () => {
  assert.equal(unitPriceProblem(5_000_000, 4_850_000), null);
  assert.equal(unitPriceProblem(4_850_000, 4_850_000), null);
  assert.match(unitPriceProblem(4_000_000, 4_850_000) ?? "", /أقل من سعر/);
  assert.equal(unitPriceProblem(null, 4_850_000), null);
  assert.equal(unitPriceProblem(1, null), null);
});

test("units match by building and number, whatever the case or spaces", () => {
  assert.equal(unitKey("B1", "101"), unitKey(" b1 ", "101 "));
  assert.notEqual(unitKey("B1", "101"), unitKey("B2", "101"));
  assert.equal(unitKey(null, "V-1"), unitKey("", "v-1"));
});

test("the admin hears at most once an hour per project", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  assert.equal(shouldNotify(null, now), true);
  assert.equal(shouldNotify(new Date("2026-11-13T11:30:00Z"), now), false);
  assert.equal(shouldNotify(new Date("2026-11-13T11:00:00Z"), now), true);
});
