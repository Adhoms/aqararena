import assert from "node:assert/strict";
import { test } from "node:test";
import { FormReader } from "@/lib/admin/form";
import {
  canCancelHold,
  canConvertHold,
  effectiveHoldHours,
  holdExpiry,
  isHoldLive,
  readHoldHours,
  salesState,
  type HoldActor,
  type HoldFacts,
} from "./holds";

const NOW = new Date("2026-11-16T10:00:00Z");
const hold = (over: Partial<HoldFacts> = {}): HoldFacts => ({
  salesAccountId: "agent1",
  developerId: "devX",
  status: "ACTIVE",
  expiresAt: new Date("2026-11-18T10:00:00Z"),
  ...over,
});
const agent1: HoldActor = { id: "agent1", role: "AGENT", developerId: "devX" };
const agent2: HoldActor = { id: "agent2", role: "AGENT", developerId: "devX" };
const lead: HoldActor = { id: "lead", role: "LEAD", developerId: "devX" };
const otherLead: HoldActor = { id: "leadY", role: "LEAD", developerId: "devY" };
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return new FormReader(data);
};

test("a hold is live while ACTIVE and before its expiry", () => {
  assert.equal(isHoldLive(hold(), NOW), true);
  assert.equal(isHoldLive(hold({ expiresAt: NOW }), NOW), false, "over at the exact moment");
  assert.equal(isHoldLive(hold({ expiresAt: new Date("2026-11-16T09:59:59Z") }), NOW), false);
  assert.equal(isHoldLive(hold({ status: "CONVERTED" }), NOW), false);
  assert.equal(isHoldLive(hold({ status: "RELEASED" }), NOW), false);
});

test("expiry is the start plus the hours", () => {
  assert.deepEqual(holdExpiry(NOW, 48), new Date("2026-11-18T10:00:00Z"));
  assert.deepEqual(holdExpiry(NOW, 1), new Date("2026-11-16T11:00:00Z"));
});

test("hold hours: the project's setting, else the developer's, else 48", () => {
  assert.equal(effectiveHoldHours(6, 72), 6);
  assert.equal(effectiveHoldHours(null, 72), 72);
  assert.equal(effectiveHoldHours(undefined, undefined), 48);
  assert.equal(effectiveHoldHours(0, 72), 72, "an out-of-range project value is ignored");
  assert.equal(effectiveHoldHours(169, 200), 48);
});

test("only the holder converts, and only while the hold is live", () => {
  assert.equal(canConvertHold(agent1, hold(), NOW), true);
  assert.equal(canConvertHold(agent2, hold(), NOW), false);
  assert.equal(canConvertHold(lead, hold(), NOW), false, "a lead cancels, never converts someone else's hold");
  assert.equal(canConvertHold(agent1, hold({ expiresAt: NOW }), NOW), false);
  assert.equal(canConvertHold(agent1, hold({ status: "RELEASED" }), NOW), false);
  assert.equal(canConvertHold(agent1, hold({ developerId: "devY" }), NOW), false);
});

test("the holder or a lead of the same developer cancels a live hold", () => {
  assert.equal(canCancelHold(agent1, hold(), NOW), true);
  assert.equal(canCancelHold(lead, hold(), NOW), true);
  assert.equal(canCancelHold(agent2, hold(), NOW), false);
  assert.equal(canCancelHold(otherLead, hold(), NOW), false);
  assert.equal(canCancelHold(lead, hold({ expiresAt: NOW }), NOW), false);
  assert.equal(canCancelHold(agent1, hold({ status: "CONVERTED" }), NOW), false);
});

test("an available unit with a live hold shows as held", () => {
  assert.equal(salesState("AVAILABLE", true), "HELD");
  assert.equal(salesState("AVAILABLE", false), "AVAILABLE");
  assert.equal(salesState("RESERVED", false), "RESERVED");
  assert.equal(salesState("SOLD", true), "SOLD");
});

test("hold hours from a form: whole hours from 1 to 168", () => {
  const ok = form({ h: "24" });
  assert.equal(readHoldHours(ok, "h", { required: true }), 24);
  assert.equal(ok.ok, true);
  const arabic = form({ h: "٤٨" });
  assert.equal(readHoldHours(arabic, "h"), 48);
  for (const bad of ["0", "169", "2.5", "abc"]) {
    const f = form({ h: bad });
    readHoldHours(f, "h", { required: true });
    assert.match(f.errors.h, /من 1 لـ 168/, bad);
  }
  const missing = form({ h: "" });
  readHoldHours(missing, "h", { required: true });
  assert.equal(missing.errors.h, "هذا الحقل مطلوب");
  const optional = form({ h: "" });
  assert.equal(readHoldHours(optional, "h"), null);
  assert.equal(optional.ok, true);
});
