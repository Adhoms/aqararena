import assert from "node:assert/strict";
import { test } from "node:test";
import { SUB_TYPES } from "@/lib/property";
import { floorLabel, holdOutcome, holdText, holdsLeavingWarning, subTypeLabel, subTypeSingular, unitLabel } from "./labels";

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
  assert.match(holdOutcome({ status: "RELEASED", releaseReason: "OUT_OF_SALES" }), /مبقتش معروضة لفريق المبيعات/);
  assert.match(holdOutcome({ status: "RELEASED", releaseReason: "ACCOUNT_DISABLED" }), /الحساب اتوقف/);
  assert.equal(holdOutcome({ status: "ACTIVE", releaseReason: null }), "ساري");
});

test("a single unit's type is singular, the filter's is the plural category", () => {
  assert.equal(subTypeSingular("VILLA"), "فيلا");
  assert.equal(subTypeLabel("VILLA"), "فيلات");
  assert.equal(subTypeSingular(null), "—");
  for (const t of SUB_TYPES) assert.notEqual(subTypeSingular(t), t, t);
});

test("a unit's live hold on the admin and portal pages: the holder, and until when", () => {
  assert.equal(holdText(undefined), undefined);
  assert.match(holdText({ expiresAt: new Date("2026-11-19T13:00:00Z"), salesAccount: { nameAr: "منى" } })!, /^منى لحد الخميس/);
});

test("an import's hold warning counts the held units leaving Sales", () => {
  assert.equal(holdsLeavingWarning(0), undefined);
  assert.match(holdsLeavingWarning(1)!, /هيخرّج من البيع وحدة عليها/);
  assert.match(holdsLeavingWarning(2)!, /وحدتين/);
  assert.match(holdsLeavingWarning(3)!, /٣ وحدات/);
});
