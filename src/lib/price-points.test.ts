import assert from "node:assert/strict";
import { test } from "node:test";
import { changedPoints, changePct, currentPoints } from "./price-points";

const types = [
  { id: "a", priceFrom: 5_000_000, buaM2: 125 }, // 40,000 per m²
  { id: "b", priceFrom: 6_600_000, buaM2: 165 }, // 40,000 per m²
  { id: "c", priceFrom: 9_240_000, buaM2: 210 }, // 44,000 per m²
];

test("current points: one per unit type plus the project average, rounded to 50", () => {
  assert.deepEqual(currentPoints(types), [
    { typologyId: "a", perM2: 40_000 },
    { typologyId: "b", perM2: 40_000 },
    { typologyId: "c", perM2: 44_000 },
    { typologyId: null, perM2: 41_350 },
  ]);
});

test("unit types without a price or an area are left out", () => {
  assert.deepEqual(currentPoints([{ id: "a", priceFrom: 0, buaM2: 100 }]), []);
  assert.equal(currentPoints([...types, { id: "d", priceFrom: 1, buaM2: 0 }]).length, 4);
});

test("nothing is recorded when no price moved", () => {
  const earlier = new Map<string | null, number>([
    ["a", 40_000],
    ["b", 40_000],
    ["c", 44_000],
    [null, 41_350],
  ]);
  assert.deepEqual(changedPoints(earlier, currentPoints(types)), []);
});

test("a changed unit type is recorded with the average it moves", () => {
  const earlier = new Map<string | null, number>([
    ["a", 38_000],
    ["b", 40_000],
    ["c", 44_000],
    [null, 40_650],
  ]);
  assert.deepEqual(changedPoints(earlier, currentPoints(types)), [
    { typologyId: "a", perM2: 40_000 },
    { typologyId: null, perM2: 41_350 },
  ]);
});

test("a first record keeps every point as the starting figure", () => {
  assert.equal(changedPoints(new Map(), currentPoints(types)).length, 4);
});

test("change in percent between the first and last figure", () => {
  assert.equal(changePct([{ perM2: 40_000 }, { perM2: 43_000 }, { perM2: 50_000 }]), 25);
  assert.equal(changePct([{ perM2: 50_000 }, { perM2: 45_000 }]), -10);
  assert.equal(changePct([{ perM2: 50_000 }]), 0);
});
