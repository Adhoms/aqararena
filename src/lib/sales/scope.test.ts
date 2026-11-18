import assert from "node:assert/strict";
import { test } from "node:test";
import { leavingSales, nothingLeaves } from "@/lib/admin/import/leaving";
import { holdInSales, projectLeavesSales, salesUnitWhere, type HoldScopeFacts } from "./scope";

test("Sales shows a developer's units in published projects, of priced types", () => {
  assert.deepEqual(salesUnitWhere("devA"), { typology: { priceFrom: { not: null }, project: { developerId: "devA", published: true } } });
});

const facts = (over: Partial<HoldScopeFacts> = {}): HoldScopeFacts => ({ holderDeveloperId: "devA", unitDeveloperId: "devA", published: true, priced: true, ...over });

test("a hold stays while its unit is visible to the holder's own developer", () => {
  assert.equal(holdInSales(facts()), true);
});

test("a hold is released when its unit leaves the holder's Sales inventory", () => {
  assert.equal(holdInSales(facts({ unitDeveloperId: "devB" })), false, "project moved to another developer");
  assert.equal(holdInSales(facts({ published: false })), false, "project unpublished");
  assert.equal(holdInSales(facts({ priced: false })), false, "type lost its starting price");
});

test("saving a project takes it out of Sales when it changes developer or ends up unpublished", () => {
  const before = { developer: "dev-a", published: true };
  assert.equal(projectLeavesSales(before, { developer: "dev-a", published: true }), false);
  assert.equal(projectLeavesSales(before, { developer: "dev-a" }), false, "no published column: stays published");
  assert.equal(projectLeavesSales(before, { developer: "dev-b", published: true }), true);
  assert.equal(projectLeavesSales(before, { developer: "dev-a", published: false }), true);
  // Already unpublished: nothing of it is in Sales, but releasing again is harmless (and cleans up).
  assert.equal(projectLeavesSales({ developer: "dev-a", published: false }, { developer: "dev-a" }), true);
});

test("an import warns about existing things only: projects moved or unpublished, unpriced types, units off the market", () => {
  const before = { id: "p1", developer: "dev-a", published: true };
  const leaving = leavingSales({
    projects: [
      { before, developer: "dev-b" },
      { before: { ...before, id: "p2" }, developer: "dev-a", published: false },
      { before: { ...before, id: "p3" }, developer: "dev-a", published: true },
      { developer: "dev-a", published: false },
    ],
    types: [
      { existingId: "t1", priceFrom: null },
      { existingId: "t2", priceFrom: 2_000_000 },
      { priceFrom: null },
    ],
    units: [
      { existingId: "u1", availability: "SOLD" },
      { existingId: "u2", availability: "RESERVED" },
      { existingId: "u3", availability: "AVAILABLE" },
      { availability: "SOLD" },
    ],
  });
  assert.deepEqual(leaving, { projectIds: ["p1", "p2"], typeIds: ["t1"], unitIds: ["u1", "u2"] });
  assert.equal(nothingLeaves(leaving), false);
  assert.equal(nothingLeaves(leavingSales({ units: [{ existingId: "u3", availability: "AVAILABLE" }] })), true);
});
