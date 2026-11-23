import type { FormReader } from "@/lib/admin/form";
import { isDialable, normalizePhone } from "./fields";

// Price-offer rules (spec sections 4, 5.4 and 7) as pure functions, so they are unit-tested: the
// developer's settings, the discount each role may give, who may see, share, approve or cancel an
// offer, and the state it shows in Sales lists and to the client.

export const OFFER_VALIDITY_MIN = 1;
export const OFFER_VALIDITY_MAX = 30;
export const DEFAULT_OFFER_VALIDITY = 7;
/** No discount above this, whatever the developer sets (the database checks it too). */
export const DISCOUNT_CAP = 20;
export const OFFER_LANGUAGES = ["ar", "en"] as const;
export type OfferLanguage = (typeof OFFER_LANGUAGES)[number];
export type OfferStatusValue = "PENDING_APPROVAL" | "ISSUED" | "CANCELLED";
export type DiscountLimits = { agentDiscountPct: number; leadDiscountPct: number };

/** The signed-in salesperson. */
export type OfferActor = { id: string; role: "AGENT" | "LEAD"; developerId: string };
/** What the permission rules need to know about an offer. */
export type OfferFacts = { salesAccountId: string; developerId: string; status: OfferStatusValue };

/** Percentages are compared in hundredths, so 2.5 and 2.50 are the same. */
const hundredths = (pct: number) => Math.round(pct * 100);
const pctText = (pct: number) => String(Number(pct.toFixed(2)));

export type DiscountDecision = { ok: false; message: string } | { ok: true; status: "ISSUED" | "PENDING_APPROVAL" };

/**
 * Within the role's own limit the offer goes out at once; above it, it waits for a team lead. Above
 * the team lead's limit it is refused for everyone, so no request reaches a lead who can't approve it.
 */
export function discountDecision(role: OfferActor["role"], discountPct: number, limits: DiscountLimits): DiscountDecision {
  const d = hundredths(discountPct);
  if (!Number.isFinite(d) || d < 0 || d > hundredths(DISCOUNT_CAP)) return { ok: false, message: `الخصم من 0 لـ ${DISCOUNT_CAP}%` };
  const lead = hundredths(limits.leadDiscountPct);
  if (d > lead) return { ok: false, message: lead === 0 ? "الشركة لسه ماحددتش خصم على العروض" : `أقصى خصم ${pctText(limits.leadDiscountPct)}%` };
  const own = role === "LEAD" ? lead : hundredths(limits.agentDiscountPct);
  return { ok: true, status: d <= own ? "ISSUED" : "PENDING_APPROVAL" };
}

const sameCompany = (actor: OfferActor, offer: OfferFacts) => actor.developerId === offer.developerId;
/** The salesperson who made it, or a team lead of the same company. */
export const canSeeOffer = (actor: OfferActor, offer: OfferFacts) => sameCompany(actor, offer) && (offer.salesAccountId === actor.id || actor.role === "LEAD");
/** Only the salesperson who made it sends it, and only once it is out. */
export const canShareOffer = (actor: OfferActor, offer: OfferFacts) => sameCompany(actor, offer) && offer.salesAccountId === actor.id && offer.status === "ISSUED";
/** A team lead of the same company approves or rejects an offer waiting for approval. */
export const canDecideOffer = (actor: OfferActor, offer: OfferFacts) => sameCompany(actor, offer) && actor.role === "LEAD" && offer.status === "PENDING_APPROVAL";
export const canCancelOffer = (actor: OfferActor, offer: OfferFacts) => canSeeOffer(actor, offer) && offer.status !== "CANCELLED";

/** An offer is valid for whole days from when it went out. */
export const offerValidUntil = (issuedAt: Date, days: number) => new Date(issuedAt.getTime() + days * 86_400_000);

export const OFFER_STATES = ["VALID", "PENDING", "EXPIRED", "PRICE_CHANGED", "UNIT_TAKEN", "CANCELLED"] as const;
export type OfferState = (typeof OFFER_STATES)[number];
export const OFFER_STATE_LABELS: Record<OfferState, string> = {
  VALID: "ساري",
  PENDING: "مستني موافقة",
  EXPIRED: "انتهت صلاحيته",
  PRICE_CHANGED: "السعر اتغيّر",
  UNIT_TAKEN: "الوحدة اتباعت أو اتحجزت",
  CANCELLED: "اتلغى",
};

/** The unit now: available; held by another salesperson; or taken (reserved, sold, deleted, or out of Sales). */
export type UnitNow = "AVAILABLE" | "HELD_BY_OTHER" | "TAKEN";
export type OfferStateFacts = { status: OfferStatusValue; validUntil: Date; unitNow: UnitNow; priceChanged: boolean };

/** What an offer shows in Sales lists, so nobody sends an old offer thinking it still holds. */
export function offerState(f: OfferStateFacts, now = new Date()): OfferState {
  if (f.status === "CANCELLED") return "CANCELLED";
  if (f.status === "PENDING_APPROVAL") return "PENDING";
  if (f.unitNow !== "AVAILABLE") return "UNIT_TAKEN";
  if (now.getTime() >= f.validUntil.getTime()) return "EXPIRED";
  if (f.priceChanged) return "PRICE_CHANGED";
  return "VALID";
}

export type ClientBanner = "CANCELLED" | "SOLD" | "EXPIRED" | null;

/**
 * The banner over the client's page (spec 7): cancelled, sold or reserved, or expired. A colleague's
 * temporary hold and a later price change are Sales' business, not the client's: the offer stands as issued.
 */
export function clientBanner(f: { status: OfferStatusValue; validUntil: Date; unitTaken: boolean }, now = new Date()): ClientBanner {
  if (f.status === "CANCELLED") return "CANCELLED";
  if (f.unitTaken) return "SOLD";
  if (now.getTime() >= f.validUntil.getTime()) return "EXPIRED";
  return null;
}

/** A discount field: 0 to 20 with at most two decimals. Empty reads as null. */
function readDiscount(f: FormReader, name: string): number | null {
  const v = f.number(name, { min: 0, max: DISCOUNT_CAP });
  if (f.errors[name]) {
    f.errors[name] = `اكتب نسبة من 0 لـ ${DISCOUNT_CAP}`;
    return null;
  }
  if (v !== null && Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) {
    f.errors[name] = "رقمين بعد العلامة بالكتير";
    return null;
  }
  return v;
}

function readValidity(f: FormReader, name: string): number | null {
  const days = f.int(name, { required: true, min: OFFER_VALIDITY_MIN, max: OFFER_VALIDITY_MAX });
  if (f.errors[name] && f.errors[name] !== "هذا الحقل مطلوب") f.errors[name] = `اكتب عدد أيام من ${OFFER_VALIDITY_MIN} لـ ${OFFER_VALIDITY_MAX}`;
  return days;
}

/** The developer's offer settings from «فريق المبيعات». */
export function readOfferSettings(f: FormReader) {
  const offerValidityDays = readValidity(f, "offerValidityDays");
  const agentDiscountPct = readDiscount(f, "agentDiscountPct") ?? 0;
  const leadDiscountPct = readDiscount(f, "leadDiscountPct") ?? 0;
  if (f.ok && hundredths(agentDiscountPct) > hundredths(leadDiscountPct)) f.errors.agentDiscountPct = "حد السيلز مايعدّيش حد قائد الفريق";
  return { offerValidityDays: offerValidityDays ?? DEFAULT_OFFER_VALIDITY, agentDiscountPct, leadDiscountPct };
}

/** The new-offer form. The unit, plan and limits are checked by the service against the database. */
export function readOfferForm(f: FormReader) {
  const unitId = f.id("unitId");
  const planId = f.id("planId");
  if (!planId) f.errors.planId = "اختار خطة السداد";
  const clientName = f.requiredText("clientName", 100);
  const rawPhone = f.text("clientPhone", { max: 40 });
  const clientPhone = rawPhone ? normalizePhone(rawPhone) : null;
  if (clientPhone && !isDialable(clientPhone)) f.errors.clientPhone = "اكتب رقم موبايل كامل";
  const clientEmail = f.text("clientEmail", { max: 200 });
  if (clientEmail && !/^\S+@\S+\.\S+$/.test(clientEmail)) f.errors.clientEmail = "بريد إلكتروني غير صالح";
  return {
    unitId,
    planId,
    clientName,
    clientPhone,
    clientEmail,
    language: f.oneOf("language", OFFER_LANGUAGES, { required: true }) ?? "ar",
    validityDays: readValidity(f, "validityDays") ?? DEFAULT_OFFER_VALIDITY,
    discountPct: readDiscount(f, "discountPct") ?? 0,
  };
}
