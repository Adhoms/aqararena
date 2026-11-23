import assert from "node:assert/strict";
import { test } from "node:test";
import { FormReader } from "@/lib/admin/form";
import {
  canCancelOffer,
  canDecideOffer,
  canSeeOffer,
  canShareOffer,
  clientBanner,
  discountDecision,
  offerState,
  offerValidUntil,
  readOfferForm,
  readOfferSettings,
  type OfferActor,
  type OfferFacts,
  type OfferStateFacts,
} from "./offers";

const NOW = new Date("2026-11-18T10:00:00Z");
const limits = { agentDiscountPct: 2, leadDiscountPct: 5 };
const agent: OfferActor = { id: "a1", role: "AGENT", developerId: "devX" };
const other: OfferActor = { id: "a2", role: "AGENT", developerId: "devX" };
const lead: OfferActor = { id: "l1", role: "LEAD", developerId: "devX" };
const leadY: OfferActor = { id: "lY", role: "LEAD", developerId: "devY" };
const offer = (over: Partial<OfferFacts> = {}): OfferFacts => ({ salesAccountId: "a1", developerId: "devX", status: "ISSUED", ...over });
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return new FormReader(data);
};

test("discount within the role's limit goes out at once, above it waits for a lead", () => {
  assert.deepEqual(discountDecision("AGENT", 0, limits), { ok: true, status: "ISSUED" });
  assert.deepEqual(discountDecision("AGENT", 2, limits), { ok: true, status: "ISSUED" });
  assert.deepEqual(discountDecision("AGENT", 2.01, limits), { ok: true, status: "PENDING_APPROVAL" });
  assert.deepEqual(discountDecision("AGENT", 5, limits), { ok: true, status: "PENDING_APPROVAL" });
  assert.deepEqual(discountDecision("LEAD", 5, limits), { ok: true, status: "ISSUED" });
});

test("above the lead's limit is refused for everyone", () => {
  for (const role of ["AGENT", "LEAD"] as const) {
    const d = discountDecision(role, 5.5, limits);
    assert.equal(d.ok, false);
    assert.match(!d.ok ? d.message : "", /أقصى خصم 5%/);
  }
  const none = discountDecision("AGENT", 1, { agentDiscountPct: 0, leadDiscountPct: 0 });
  assert.match(!none.ok ? none.message : "", /ماحددتش خصم/);
  assert.equal(discountDecision("AGENT", -1, limits).ok, false);
  assert.equal(discountDecision("LEAD", 25, { agentDiscountPct: 20, leadDiscountPct: 20 }).ok, false);
});

test("who sees, shares, decides and cancels", () => {
  assert.equal(canSeeOffer(agent, offer()), true);
  assert.equal(canSeeOffer(other, offer()), false);
  assert.equal(canSeeOffer(lead, offer()), true);
  assert.equal(canSeeOffer(leadY, offer()), false);
  assert.equal(canShareOffer(agent, offer()), true);
  assert.equal(canShareOffer(lead, offer()), false, "only the salesperson sends their offer");
  assert.equal(canShareOffer(agent, offer({ status: "PENDING_APPROVAL" })), false);
  assert.equal(canDecideOffer(lead, offer({ status: "PENDING_APPROVAL" })), true);
  assert.equal(canDecideOffer(agent, offer({ status: "PENDING_APPROVAL" })), false);
  assert.equal(canDecideOffer(lead, offer()), false);
  assert.equal(canDecideOffer(leadY, offer({ developerId: "devX", status: "PENDING_APPROVAL" })), false);
  assert.equal(canCancelOffer(agent, offer()), true);
  assert.equal(canCancelOffer(lead, offer()), true);
  assert.equal(canCancelOffer(other, offer()), false);
  assert.equal(canCancelOffer(agent, offer({ status: "CANCELLED" })), false);
});

test("validity is whole days from issue", () => {
  assert.deepEqual(offerValidUntil(NOW, 7), new Date("2026-11-25T10:00:00Z"));
});

const facts = (over: Partial<OfferStateFacts> = {}): OfferStateFacts => ({
  status: "ISSUED",
  validUntil: new Date("2026-11-25T10:00:00Z"),
  unitNow: "AVAILABLE",
  priceChanged: false,
  ...over,
});

test("the state an offer shows in Sales lists", () => {
  assert.equal(offerState(facts(), NOW), "VALID");
  assert.equal(offerState(facts({ status: "PENDING_APPROVAL" }), NOW), "PENDING");
  assert.equal(offerState(facts({ status: "CANCELLED", unitNow: "TAKEN" }), NOW), "CANCELLED", "cancelled wins");
  assert.equal(offerState(facts({ unitNow: "TAKEN" }), NOW), "UNIT_TAKEN");
  assert.equal(offerState(facts({ unitNow: "HELD_BY_OTHER" }), NOW), "UNIT_TAKEN", "a colleague's hold blocks it too");
  assert.equal(offerState(facts({ validUntil: NOW }), NOW), "EXPIRED", "over at the exact moment");
  assert.equal(offerState(facts({ validUntil: NOW, priceChanged: true }), NOW), "EXPIRED");
  assert.equal(offerState(facts({ priceChanged: true }), NOW), "PRICE_CHANGED");
});

test("the banner over the client's page", () => {
  const f = { status: "ISSUED" as const, validUntil: new Date("2026-11-25T10:00:00Z"), unitTaken: false };
  assert.equal(clientBanner(f, NOW), null);
  assert.equal(clientBanner({ ...f, status: "CANCELLED" }, NOW), "CANCELLED");
  assert.equal(clientBanner({ ...f, unitTaken: true }, NOW), "SOLD");
  assert.equal(clientBanner({ ...f, validUntil: NOW }, NOW), "EXPIRED");
});

test("developer settings: validity 1 to 30 days, discounts 0 to 20, the agent's no higher than the lead's", () => {
  const ok = form({ offerValidityDays: "10", agentDiscountPct: "1.5", leadDiscountPct: "3" });
  assert.deepEqual(readOfferSettings(ok), { offerValidityDays: 10, agentDiscountPct: 1.5, leadDiscountPct: 3 });
  assert.equal(ok.ok, true);
  const days = form({ offerValidityDays: "31", agentDiscountPct: "0", leadDiscountPct: "0" });
  readOfferSettings(days);
  assert.match(days.errors.offerValidityDays, /من 1 لـ 30/);
  const order = form({ offerValidityDays: "7", agentDiscountPct: "4", leadDiscountPct: "3" });
  readOfferSettings(order);
  assert.match(order.errors.agentDiscountPct, /مايعدّيش/);
  const cap = form({ offerValidityDays: "7", agentDiscountPct: "0", leadDiscountPct: "21" });
  readOfferSettings(cap);
  assert.match(cap.errors.leadDiscountPct, /من 0 لـ 20/);
  const decimals = form({ offerValidityDays: "7", agentDiscountPct: "1.255", leadDiscountPct: "3" });
  readOfferSettings(decimals);
  assert.match(decimals.errors.agentDiscountPct, /رقمين/);
});

test("the new-offer form", () => {
  const f = form({ unitId: "cunit0000000000001", planId: "cplan0000000000001", clientName: "أحمد علي", clientPhone: "٠١٠١٢٣٤٥٦٧٨", language: "en", validityDays: "5", discountPct: "" });
  assert.deepEqual(readOfferForm(f), {
    unitId: "cunit0000000000001",
    planId: "cplan0000000000001",
    clientName: "أحمد علي",
    clientPhone: "01012345678",
    clientEmail: null,
    language: "en",
    validityDays: 5,
    discountPct: 0,
  });
  assert.equal(f.ok, true);
  const bad = form({ clientName: "", clientPhone: "12", clientEmail: "x@", language: "fr", validityDays: "40", discountPct: "3" });
  readOfferForm(bad);
  assert.deepEqual(Object.keys(bad.errors).sort(), ["clientEmail", "clientName", "clientPhone", "language", "planId", "validityDays"]);
});
