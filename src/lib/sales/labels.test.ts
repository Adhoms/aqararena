// src/lib/sales/labels.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { floorLabel, holdOutcome, unitLabel } from "./labels";

test("unit names: building and number", () => {
  assert.equal(unitLabel({ building: "B1", unitNumber: "301" }), "B1 · 301");
  assert.equal(unitLabel({ building: null, unitNumber: "12" }), "12");
  assert.equal(unitLabel({ building: null, unitNumber: null }), "وحدة بدون رقم");
});

test("floors", () => {
  assert.equal(floorLabel(0), "أرضي");
  assert.equal(floorLabel(null), "—");
  assert.equal(floorLabel(-1), "بدروم");
  assert.equal(floorLabel(7), "7");
});

test("how a hold ended", () => {
  assert.match(holdOutcome({ status: "CONVERTED", releaseReason: null }), /اتأكد/);
  assert.match(holdOutcome({ status: "RELEASED", releaseReason: "EXPIRED" }), /خلص وقته/);
  assert.equal(holdOutcome({ status: "RELEASED", releaseReason: "CANCELLED" }), "اتلغى");
  assert.match(holdOutcome({ status: "RELEASED", releaseReason: "PORTAL_STATUS_CHANGE" }), /الشركة/);
  assert.match(holdOutcome({ status: "RELEASED", releaseReason: "ADMIN_STATUS_CHANGE" }), /AqarArena/);
  assert.equal(holdOutcome({ status: "ACTIVE", releaseReason: null }), "سارية");
});
