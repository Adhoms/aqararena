import "server-only";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { FEDDAN_M2 } from "@/lib/admin/readers";
import { formatDateTimeAr } from "@/lib/format";
import { stepsOf } from "@/lib/catalog/plan-steps";
import {
  buildSchedule,
  cairoDate,
  maintenanceAmount,
  monthsBetween,
  payablePrice,
  planFingerprint,
  planSteps,
  type SchedulePlan,
} from "@/lib/catalog/schedule";
import { isBusy, pgCode } from "./hold-errors";
import { BUSY, limitLockWait, lockUnit, releaseExpired, salesHoldWhere, TX_OPTIONS } from "./hold-service";
import { unitLabel } from "./labels";
import { asSnapshot, SNAPSHOT_VERSION, type OfferSnapshot } from "./offer-snapshot";
import { isOfferToken, newOfferToken } from "./offer-token";
import {
  canCancelOffer,
  canDecideOffer,
  canSeeOffer,
  canShareOfferNow,
  clientBanner,
  discountDecision,
  OFFER_VALIDITY_MAX,
  OFFER_VALIDITY_MIN,
  offerState,
  offerValidUntil,
  type ClientBanner,
  type OfferActor,
  type OfferLanguage,
  type OfferState,
  type UnitNow,
} from "./offers";
import { salesOfferWhere, salesUnitWhere } from "./scope";

// Price offers (spec sections 4, 5 and 7). Creating and approving one run in a transaction that locks
// the unit row first, like holds (hold-service.ts): a sale or a hold changing the unit at the same
// moment either finishes first and is seen, or waits. An offer never holds the unit. Every query is
// scoped by the salesperson's developer (scope.ts); another company's ids find nothing.

type Client = typeof db;
type Tx = Prisma.TransactionClient;
export type OfferResult = { ok: false; message: string } | { ok: true; id: string; status: "ISSUED" | "PENDING_APPROVAL" };
export type ActionResult = { ok: boolean; message: string };
type Options = { client?: Client; now?: Date };

const GONE: ActionResult = { ok: false, message: "العرض ده مش موجود" };
const PRICE_MOVED = "السعر أو خطة السداد اتغيّروا من ساعة ما العرض اتعمل. ارفضه والسيلز يعمل عرض جديد";
const PLAN_GONE = "خطة السداد دي مش سارية دلوقتي، اختار خطة تانية";
/** Another team lead approved or rejected it a moment earlier. */
const DECIDED: ActionResult = { ok: false, message: "العرض ده اتوافق عليه أو اترفض بالفعل" };
const dec = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));
const notPdf = (url: string) => !/\.pdf(\?|$)/i.test(url);
/** Today on Cairo's calendar, as the UTC midnight a `@db.Date` column compares with (as in inventory.ts). */
const todayCairo = (now: Date) => new Date(`${cairoDate(now)}T00:00:00Z`);

type PlanRow = Prisma.PaymentPlanGetPayload<{ include: { steps: true } }>;

/** A plan as the schedule math reads it. */
export const planTerms = (p: PlanRow): SchedulePlan => ({
  downPaymentPct: Number(p.downPaymentPct),
  deliveryPaymentPct: Number(p.deliveryPaymentPct),
  years: p.years,
  frequency: p.frequency,
  cashDiscountPct: dec(p.cashDiscountPct),
  maintenancePct: dec(p.maintenancePct),
  steps: stepsOf(p.steps),
});

const fingerprintOf = (p: PlanRow) => planFingerprint({ ...planTerms(p), typologyId: p.typologyId });

/** Plans Sales sells on today: active and not past their end date (the rule of inventory.ts salesPlans). */
const offeredPlansWhere = (projectIds: string[], now: Date): Prisma.PaymentPlanWhereInput => ({
  projectId: { in: projectIds },
  isActive: true,
  OR: [{ validUntil: null }, { validUntil: { gte: todayCairo(now) } }],
});

/** The plans offered today on a unit: the project's, for every type or the unit's own. */
const unitPlansWhere = (unit: { typologyId: string; typology: { projectId: string } }, now: Date): Prisma.PaymentPlanWhereInput => ({
  ...offeredPlansWhere([unit.typology.projectId], now),
  AND: [{ OR: [{ typologyId: null }, { typologyId: unit.typologyId }] }],
});

type Prints = Map<string, { typologyId: string | null; fingerprint: string }[]>;

/** The current plans' fingerprints by project, to tell whether an offer's plan is still offered as it was. */
async function currentFingerprints(client: Client | Tx, projectIds: string[], now: Date): Promise<Prints> {
  const plans = projectIds.length ? await client.paymentPlan.findMany({ where: offeredPlansWhere(projectIds, now), include: { steps: true } }) : [];
  const out: Prints = new Map();
  for (const p of plans) out.set(p.projectId, [...(out.get(p.projectId) ?? []), { typologyId: p.typologyId, fingerprint: fingerprintOf(p) }]);
  return out;
}

type UnitNowRow = {
  availability: string;
  price: Prisma.Decimal | null;
  typologyId: string;
  typology: { priceFrom: Prisma.Decimal | null; projectId: string; project: { currency: string } };
};

const listPriceOf = (unit: UnitNowRow) => Math.round(Number(unit.price ?? unit.typology.priceFrom));

/** The unit's price, the project's currency or the offer's plan changed since the offer was made. */
function priceMoved(unit: UnitNowRow, snap: OfferSnapshot, prints: Prints) {
  if (listPriceOf(unit) !== snap.listPrice || unit.typology.project.currency !== snap.currency) return true;
  return !(prints.get(unit.typology.projectId) ?? []).some((p) => (p.typologyId === null || p.typologyId === unit.typologyId) && p.fingerprint === snap.plan.fingerprint);
}

/** Why an offer can't be made (or approved) on this unit for `salesAccountId` now, or null. */
async function unitBlock(tx: Tx, unit: { id: string; availability: string }, salesAccountId: string, developerId: string, now: Date): Promise<string | null> {
  if (unit.availability !== "AVAILABLE") return "الوحدة دي مش متاحة دلوقتي";
  const hold = await tx.unitHold.findFirst({
    where: { unitId: unit.id, ...salesHoldWhere(developerId, now) },
    select: { salesAccountId: true, expiresAt: true, salesAccount: { select: { nameAr: true } } },
  });
  if (hold && hold.salesAccountId !== salesAccountId) return `الوحدة محجوزة مؤقتًا لـ ${hold.salesAccount.nameAr} لحد ${formatDateTimeAr(hold.expiresAt)}، فمينفعش يتعمل عليها عرض`;
  return null;
}

/**
 * The salesperson the offer is from, if their account is still on. The share lock makes disabling the
 * account wait for this transaction (as createHold does), taken after the unit's lock, in the same order.
 */
async function activeSalesperson(tx: Tx, salesAccountId: string, developerId: string): Promise<OfferSnapshot["salesperson"] | null> {
  const rows = await tx.$queryRaw<OfferSnapshot["salesperson"][]>`
    SELECT "nameAr", "nameEn", "phone", "whatsapp", "email" FROM "SalesAccount"
    WHERE "id" = ${salesAccountId} AND "developerId" = ${developerId} AND "status" = 'ACTIVE'
    FOR SHARE`;
  return rows[0] ?? null;
}

const unitForOffer = {
  id: true,
  building: true,
  unitNumber: true,
  floor: true,
  view: true,
  orientation: true,
  price: true,
  availability: true,
  typologyId: true,
  zone: { select: { xPct: true, yPct: true, widthPct: true, heightPct: true, nameAr: true, nameEn: true } },
  typology: {
    select: {
      projectId: true,
      code: true,
      nameAr: true,
      nameEn: true,
      subType: true,
      finishing: true,
      buaM2: true,
      gardenM2: true,
      roofM2: true,
      terraceM2: true,
      bedrooms: true,
      bathrooms: true,
      priceFrom: true,
      media: { where: { kind: "FLOOR_PLAN_2D" }, orderBy: { sortOrder: "asc" }, select: { url: true } },
      project: {
        select: {
          id: true,
          slug: true,
          nameAr: true,
          nameEn: true,
          descriptionAr: true,
          descriptionEn: true,
          districtAr: true,
          districtEn: true,
          deliveryDate: true,
          landAreaM2: true,
          unitsCount: true,
          currency: true,
          masterPlanUrl: true,
          area: { select: { nameAr: true, nameEn: true } },
          developer: { select: { nameAr: true, nameEn: true, logoUrl: true, hotline: true, website: true, agentDiscountPct: true, leadDiscountPct: true } },
          media: { where: { kind: { in: ["IMAGE", "MASTER_PLAN", "FLOOR_PLAN_2D"] } }, orderBy: { sortOrder: "asc" }, select: { kind: true, group: true, url: true } },
        },
      },
    },
  },
} satisfies Prisma.UnitSelect;
type OfferUnit = Prisma.UnitGetPayload<{ select: typeof unitForOffer }>;

export type OfferInput = {
  unitId: string;
  planId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  language: OfferLanguage;
  validityDays: number;
  discountPct: number;
};
type SnapshotInput = Pick<OfferInput, "clientName" | "clientPhone" | "validityDays" | "discountPct">;

/** Every figure and text the offer prints, as of `now` (its issue: creation, or a team lead's approval). */
function buildSnapshot(unit: OfferUnit, plan: PlanRow, salesperson: OfferSnapshot["salesperson"], input: SnapshotInput, now: Date): OfferSnapshot {
  const t = unit.typology;
  const p = t.project;
  const d = p.developer;
  const terms = planTerms(plan);
  const handover = monthsBetween(cairoDate(now), p.deliveryDate.toISOString().slice(0, 10));
  const listPrice = listPriceOf(unit);
  const price = payablePrice(listPrice, terms, input.discountPct);
  const photo = p.media.find((m) => m.kind === "IMAGE" && m.group === "EXTERIOR") ?? p.media.find((m) => m.kind === "IMAGE");
  const projectPlans = p.media.filter((m) => m.kind === "FLOOR_PLAN_2D").map((m) => m.url);
  const z = unit.zone;
  return {
    v: SNAPSHOT_VERSION,
    currency: p.currency,
    validityDays: input.validityDays,
    developer: { nameAr: d.nameAr, nameEn: d.nameEn, logoUrl: d.logoUrl, hotline: d.hotline, website: d.website },
    project: {
      id: p.id,
      slug: p.slug,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      descriptionAr: p.descriptionAr,
      descriptionEn: p.descriptionEn,
      placeAr: [p.districtAr, p.area.nameAr].filter(Boolean).join("، "),
      placeEn: [p.districtEn, p.area.nameEn].filter(Boolean).join(", "),
      deliveryDate: p.deliveryDate.toISOString().slice(0, 10),
      landFeddan: p.landAreaM2 === null ? null : Math.round((Number(p.landAreaM2) / FEDDAN_M2) * 10) / 10,
      unitsCount: p.unitsCount,
      photo: photo?.url ?? null,
      masterPlan: p.masterPlanUrl ?? p.media.find((m) => m.kind === "MASTER_PLAN")?.url ?? null,
      zone: z ? { x: Number(z.xPct), y: Number(z.yPct), w: Number(z.widthPct), h: Number(z.heightPct), nameAr: z.nameAr, nameEn: z.nameEn } : null,
    },
    unit: {
      id: unit.id,
      label: unitLabel(unit),
      floor: unit.floor,
      view: unit.view,
      orientation: unit.orientation,
      typeCode: t.code,
      typeNameAr: t.nameAr,
      typeNameEn: t.nameEn,
      subType: t.subType,
      finishing: t.finishing,
      buaM2: Number(t.buaM2),
      gardenM2: dec(t.gardenM2),
      roofM2: dec(t.roofM2),
      terraceM2: dec(t.terraceM2),
      bedrooms: t.bedrooms,
      bathrooms: t.bathrooms,
      floorPlan: t.media.map((m) => m.url).find(notPdf) ?? projectPlans.find(notPdf) ?? null,
    },
    plan: {
      nameAr: plan.nameAr,
      nameEn: plan.nameEn,
      frequency: plan.frequency,
      years: plan.years,
      cash: plan.years === 0,
      custom: terms.steps.length > 0,
      cashDiscountPct: terms.cashDiscountPct ?? null,
      maintenancePct: terms.maintenancePct ?? null,
      fingerprint: planFingerprint({ ...terms, typologyId: plan.typologyId }),
    },
    listPrice,
    discountPct: input.discountPct,
    price,
    schedule: buildSchedule(price, planSteps(terms, handover), maintenanceAmount(price, terms), handover),
    client: { name: input.clientName, phone: input.clientPhone },
    salesperson,
  };
}

const limitsOf = (d: { agentDiscountPct: Prisma.Decimal; leadDiscountPct: Prisma.Decimal }) => ({
  agentDiscountPct: Number(d.agentDiscountPct),
  leadDiscountPct: Number(d.leadDiscountPct),
});

/**
 * Locks the plan row against deletion until the transaction ends (a portal approval deletes and
 * re-creates plans), so the offer never points at a plan that is gone. False when it already is.
 */
async function lockPlan(tx: Tx, planId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "PaymentPlan" WHERE "id" = ${planId} FOR KEY SHARE`;
  return rows.length > 0;
}

/** A row it points at (the plan) was deleted at the same moment: Postgres 23503, Prisma P2003. */
const isMissingReference = (e: unknown) => (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") || pgCode(e) === "23503";

/** Makes an offer: issued at once within the salesperson's discount limit, otherwise waiting for a team lead. */
export async function createOffer(me: OfferActor, input: OfferInput, { client = db, now = new Date() }: Options = {}): Promise<OfferResult> {
  if (!Number.isInteger(input.validityDays) || input.validityDays < OFFER_VALIDITY_MIN || input.validityDays > OFFER_VALIDITY_MAX) {
    return { ok: false, message: `الصلاحية من ${OFFER_VALIDITY_MIN} لـ ${OFFER_VALIDITY_MAX} يوم` };
  }
  if (!Number.isFinite(input.discountPct)) return { ok: false, message: "الخصم مش رقم" };
  // The discount as stored (two decimals), so the status, the snapshot and the row all agree.
  input = { ...input, discountPct: Math.round(input.discountPct * 100) / 100 };
  try {
    return await client.$transaction(async (tx): Promise<OfferResult> => {
      await limitLockWait(tx);
      // The unit first, then the account, then the plan: the unit and account in the order createHold
      // takes them, so the two never deadlock.
      await lockUnit(tx, input.unitId);
      const unit = await tx.unit.findFirst({ where: { id: input.unitId, ...salesUnitWhere(me.developerId) }, select: unitForOffer });
      if (!unit) return { ok: false, message: "الوحدة دي مش موجودة في مشروعات شركتك" };
      const salesperson = await activeSalesperson(tx, me.id, me.developerId);
      if (!salesperson) return { ok: false, message: "حسابك اتوقف. كلّم الشركة" };
      if (!(await lockPlan(tx, input.planId))) return { ok: false, message: PLAN_GONE };
      await releaseExpired(tx, { unitId: unit.id }, now);
      const blocked = await unitBlock(tx, unit, me.id, me.developerId, now);
      if (blocked) return { ok: false, message: blocked };
      const plan = await tx.paymentPlan.findFirst({ where: { id: input.planId, ...unitPlansWhere(unit, now) }, include: { steps: true } });
      if (!plan) return { ok: false, message: "خطة السداد دي مش سارية للوحدة دي" };
      const decision = discountDecision(me.role, input.discountPct, limitsOf(unit.typology.project.developer));
      if (!decision.ok) return decision;
      const offer = await tx.salesOffer.create({
        data: {
          token: newOfferToken(),
          developerId: me.developerId,
          salesAccountId: me.id,
          unitId: unit.id,
          paymentPlanId: plan.id,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          clientEmail: input.clientEmail,
          language: input.language,
          currency: unit.typology.project.currency,
          issuedAt: now,
          validUntil: offerValidUntil(now, input.validityDays),
          snapshot: buildSnapshot(unit, plan, salesperson, input, now) as unknown as Prisma.InputJsonValue,
          discountPct: input.discountPct,
          status: decision.status,
          wasIssued: decision.status === "ISSUED",
        },
        select: { id: true },
      });
      return { ok: true, id: offer.id, status: decision.status };
    }, TX_OPTIONS);
  } catch (e) {
    if (isBusy(e)) return { ok: false, message: BUSY.message };
    if (isMissingReference(e)) return { ok: false, message: PLAN_GONE };
    throw e;
  }
}

/**
 * A team lead approves an offer that waits for approval. It is re-checked first (the unit still free,
 * the price and plan unchanged, the discount still within the lead's limit, the salesperson still
 * active), then issued from now: a new snapshot as of approval (the handover month and the schedule
 * count from today), and its validity starts now.
 */
export async function approveOffer(lead: OfferActor, offerId: string, { client = db, now = new Date() }: Options = {}): Promise<ActionResult> {
  try {
    return await client.$transaction(async (tx): Promise<ActionResult> => {
      await limitLockWait(tx);
      const offer = await tx.salesOffer.findFirst({
        where: { id: offerId, ...salesOfferWhere(lead.developerId) },
        select: { id: true, status: true, salesAccountId: true, developerId: true, unitId: true, paymentPlanId: true, discountPct: true, clientName: true, clientPhone: true, snapshot: true },
      });
      if (!offer) return GONE;
      if (!canDecideOffer(lead, offer)) return { ok: false, message: "العرض ده مش مستني موافقة" };
      const snap = asSnapshot(offer.snapshot);
      if (!offer.unitId || !snap) return { ok: false, message: "الوحدة اتمسحت، ارفض العرض" };
      await lockUnit(tx, offer.unitId);
      const unit = await tx.unit.findFirst({ where: { id: offer.unitId, ...salesUnitWhere(lead.developerId) }, select: unitForOffer });
      if (!unit) return { ok: false, message: "الوحدة مبقتش في المخزون، ارفض العرض" };
      const salesperson = await activeSalesperson(tx, offer.salesAccountId, lead.developerId);
      if (!salesperson) return { ok: false, message: "حساب السيلز صاحب العرض اتوقف، ارفض العرض" };
      await releaseExpired(tx, { unitId: unit.id }, now);
      const blocked = await unitBlock(tx, unit, offer.salesAccountId, lead.developerId, now);
      if (blocked) return { ok: false, message: blocked };
      // The plan as it was offered: the same row if it is still offered unchanged, else (a portal
      // approval re-creates plans) a current plan with the same terms and steps.
      const plans = await tx.paymentPlan.findMany({ where: unitPlansWhere(unit, now), orderBy: { createdAt: "asc" }, include: { steps: true } });
      const same = plans.filter((p) => fingerprintOf(p) === snap.plan.fingerprint);
      const plan = same.find((p) => p.id === offer.paymentPlanId) ?? same[0];
      if (!plan || listPriceOf(unit) !== snap.listPrice || unit.typology.project.currency !== snap.currency) return { ok: false, message: PRICE_MOVED };
      if (!(await lockPlan(tx, plan.id))) return { ok: false, message: PLAN_GONE };
      const discountPct = Number(offer.discountPct);
      if (!discountDecision("LEAD", discountPct, limitsOf(unit.typology.project.developer)).ok) return { ok: false, message: "الخصم ده أكبر من حدّك دلوقتي" };
      const input: SnapshotInput = { clientName: offer.clientName, clientPhone: offer.clientPhone, validityDays: snap.validityDays, discountPct };
      const { count } = await tx.salesOffer.updateMany({
        where: { id: offer.id, status: "PENDING_APPROVAL" },
        data: {
          status: "ISSUED",
          wasIssued: true,
          approvedById: lead.id,
          approvedAt: now,
          issuedAt: now,
          validUntil: offerValidUntil(now, snap.validityDays),
          paymentPlanId: plan.id,
          snapshot: buildSnapshot(unit, plan, salesperson, input, now) as unknown as Prisma.InputJsonValue,
        },
      });
      return count ? { ok: true, message: "اتوافق ✓ والعرض بقى ساري" } : DECIDED;
    }, TX_OPTIONS);
  } catch (e) {
    if (isBusy(e)) return BUSY;
    if (isMissingReference(e)) return { ok: false, message: PLAN_GONE };
    throw e;
  }
}

/** Cancels an offer (its salesperson or a team lead), or rejects one waiting for approval (a team lead). */
export async function cancelOffer(actor: OfferActor, offerId: string, now = new Date()): Promise<ActionResult> {
  const offer = await db.salesOffer.findFirst({ where: { id: offerId, ...salesOfferWhere(actor.developerId) }, select: { salesAccountId: true, developerId: true, status: true } });
  if (!offer || !canSeeOffer(actor, offer)) return GONE;
  if (!canCancelOffer(actor, offer)) return { ok: false, message: "العرض ده متلغي بالفعل" };
  // An offer that never went out gets a new token as it ends, so its link never opens for anyone.
  // Each branch is conditioned on the status read, so a parallel approval is never undone silently.
  // The clean PDF goes with it: the row is locked so a PDF stored at the same moment is either seen
  // here and deleted, or not stored at all (offerPdf stores only on an issued offer).
  const pending = offer.status === "PENDING_APPROVAL";
  let count = 0;
  let oldPdf: string | null = null;
  try {
    ({ count, oldPdf } = await db.$transaction(async (tx) => {
      await limitLockWait(tx);
      const [row] = await tx.$queryRaw<{ pdfUrl: string | null }[]>`SELECT "pdfUrl" FROM "SalesOffer" WHERE "id" = ${offerId} FOR UPDATE`;
      const { count } = await tx.salesOffer.updateMany({
        where: { id: offerId, ...salesOfferWhere(actor.developerId), status: offer.status },
        data: { status: "CANCELLED", cancelledById: actor.id, cancelledAt: now, pdfUrl: null, ...(pending && { token: newOfferToken() }) },
      });
      return { count, oldPdf: row?.pdfUrl ?? null };
    }, TX_OPTIONS));
  } catch (e) {
    if (isBusy(e)) return { ok: false, message: BUSY.message };
    throw e;
  }
  if (!count) return pending ? DECIDED : { ok: false, message: "العرض ده متلغي بالفعل" };
  if (oldPdf && process.env.BLOB_READ_WRITE_TOKEN) await del(oldPdf).catch(() => undefined);
  return { ok: true, message: pending && offer.salesAccountId !== actor.id ? "اترفض ✓" : "اتلغى ✓" };
}

export const SHARE_CHANNELS = ["WHATSAPP", "TELEGRAM", "EMAIL", "DEVICE"] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

/**
 * Notes that the salesperson shared their issued offer this way (once per channel). Ignored unless the
 * offer may be sent now (canShareOfferNow: theirs, issued, valid or only re-priced), or for any other channel.
 */
export async function recordShare(me: OfferActor, offerId: string, channel: ShareChannel, now = new Date()): Promise<void> {
  if (!(SHARE_CHANNELS as readonly string[]).includes(channel)) return;
  const offer = await db.salesOffer.findFirst({
    where: { id: offerId, ...salesOfferWhere(me.developerId) },
    select: { id: true, salesAccountId: true, developerId: true, status: true, validUntil: true, unitId: true, snapshot: true },
  });
  if (!offer) return;
  const [{ state }] = await withStates(me.developerId, [offer], now);
  if (!canShareOfferNow(me, offer, state)) return;
  await db.$executeRaw`
    UPDATE "SalesOffer" SET "sentVia" = array_append("sentVia", ${channel}::"OfferChannel"), "updatedAt" = now()
    WHERE "id" = ${offer.id} AND "salesAccountId" = ${me.id} AND "developerId" = ${me.developerId}
      AND "status" = 'ISSUED' AND NOT (${channel}::"OfferChannel" = ANY("sentVia"))`;
}

const listSelect = {
  id: true,
  token: true,
  status: true,
  wasIssued: true,
  issuedAt: true,
  validUntil: true,
  createdAt: true,
  unitId: true,
  salesAccountId: true,
  developerId: true,
  clientName: true,
  discountPct: true,
  sentVia: true,
  snapshot: true,
  salesAccount: { select: { nameAr: true } },
} satisfies Prisma.SalesOfferSelect;
type ListRow = Prisma.SalesOfferGetPayload<{ select: typeof listSelect }>;
/** An offer in a Sales list. `token` is null unless it went out: an offer waiting for approval, or rejected, has no link to hand out. */
export type OfferRow = Omit<ListRow, "token"> & { token: string | null; state: OfferState; snap: OfferSnapshot | null };

/** Hides the client's link of an offer that never went out. */
const withLink = <T extends { token: string; wasIssued: boolean }>(row: T): Omit<T, "token"> & { token: string | null } => ({
  ...row,
  token: row.wasIssued ? row.token : null,
});

/** Each offer's state now (spec 5.4): checks the units, holds and current plans in two queries. */
export async function withStates<T extends Pick<ListRow, "status" | "validUntil" | "unitId" | "salesAccountId" | "snapshot">>(
  developerId: string,
  offers: T[],
  now = new Date(),
): Promise<(T & { state: OfferState; snap: OfferSnapshot | null })[]> {
  const unitIds = [...new Set(offers.flatMap((o) => (o.unitId ? [o.unitId] : [])))];
  const units = unitIds.length
    ? await db.unit.findMany({
        where: { id: { in: unitIds }, ...salesUnitWhere(developerId) },
        select: { id: true, availability: true, price: true, typologyId: true, typology: { select: { priceFrom: true, projectId: true, project: { select: { currency: true } } } }, holds: { where: salesHoldWhere(developerId, now), take: 1, select: { salesAccountId: true } } },
      })
    : [];
  const byId = new Map(units.map((u) => [u.id, u]));
  const prints = await currentFingerprints(db, [...new Set(units.map((u) => u.typology.projectId))], now);
  return offers.map((o) => {
    const snap = asSnapshot(o.snapshot);
    const unit = o.unitId ? byId.get(o.unitId) : undefined;
    const held = unit?.holds[0];
    const unitNow: UnitNow = !unit || unit.availability !== "AVAILABLE" ? "TAKEN" : held && held.salesAccountId !== o.salesAccountId ? "HELD_BY_OTHER" : "AVAILABLE";
    const priceChanged = !unit || !snap || priceMoved(unit, snap, prints);
    return { ...o, snap, state: offerState({ status: o.status, validUntil: o.validUntil, unitNow, priceChanged }, now) };
  });
}

/** The salesperson's latest offers, newest first. */
export async function myOffers(me: OfferActor, now = new Date(), take = 100): Promise<OfferRow[]> {
  const rows = await db.salesOffer.findMany({ where: { salesAccountId: me.id, ...salesOfferWhere(me.developerId) }, orderBy: { createdAt: "desc" }, take, select: listSelect });
  return (await withStates(me.developerId, rows, now)).map(withLink);
}

/** For a team lead: the team's offers waiting for approval, oldest first. */
export async function pendingApprovals(lead: OfferActor, now = new Date()): Promise<OfferRow[]> {
  if (lead.role !== "LEAD") return [];
  const rows = await db.salesOffer.findMany({ where: { ...salesOfferWhere(lead.developerId), status: "PENDING_APPROVAL" }, orderBy: { createdAt: "asc" }, take: 100, select: listSelect });
  return (await withStates(lead.developerId, rows, now)).map(withLink);
}

/**
 * Offers the salesperson issued (spec 3, «ملفي»): every one that went out, at once or approved, even if
 * cancelled later; not those rejected while waiting. All of them, and those issued in the last 30 days.
 */
export async function offerCounts(me: OfferActor, now = new Date()) {
  const issued = { salesAccountId: me.id, ...salesOfferWhere(me.developerId), wasIssued: true };
  const [total, recent] = await Promise.all([
    db.salesOffer.count({ where: issued }),
    db.salesOffer.count({ where: { ...issued, issuedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } } }),
  ]);
  return { total, recent };
}

/** One offer for its salesperson or a team lead of the company, with its state; null otherwise. */
export async function loadOffer(me: OfferActor, offerId: string, now = new Date()) {
  const row = await db.salesOffer.findFirst({
    where: { id: offerId, ...salesOfferWhere(me.developerId) },
    select: { ...listSelect, clientPhone: true, clientEmail: true, language: true, currency: true, pdfUrl: true, approvedAt: true, approvedBy: { select: { nameAr: true } }, cancelledAt: true, cancelledBy: { select: { nameAr: true } } },
  });
  if (!row || !canSeeOffer(me, row)) return null;
  const [withState] = await withStates(me.developerId, [row], now);
  return { ...withLink(withState), canShare: canShareOfferNow(me, row, withState.state), canDecide: canDecideOffer(me, row), canCancel: canCancelOffer(me, row) };
}

/**
 * The snapshot as the client sees it: without the database ids of the project and the unit, the plan's
 * fingerprint (it carries the unit type's id) and the client's phone number (Sales' record, not the page's).
 */
export type PublicSnapshot = Omit<OfferSnapshot, "project" | "unit" | "plan" | "client"> & {
  project: Omit<OfferSnapshot["project"], "id">;
  unit: Omit<OfferSnapshot["unit"], "id">;
  plan: Omit<OfferSnapshot["plan"], "fingerprint">;
  client: Pick<OfferSnapshot["client"], "name">;
};

/** What the client's page gets: the offer as issued, its banner, nothing internal (no ids, no other offers). */
export type PublicOffer = {
  token: string;
  language: OfferLanguage;
  issuedAt: Date;
  validUntil: Date;
  pdfUrl: string | null;
  banner: ClientBanner;
  snap: PublicSnapshot;
};

function publicSnapshot(snap: OfferSnapshot): PublicSnapshot {
  const { id: _project, ...project } = snap.project;
  const { id: _unit, ...unit } = snap.unit;
  const { fingerprint: _fingerprint, ...plan } = snap.plan;
  void _project;
  void _unit;
  void _fingerprint;
  return { ...snap, project, unit, plan, client: { name: snap.client.name } };
}

/** The offer behind a client's link. An offer waiting for approval, or rejected, doesn't open (spec 7). */
export async function loadPublicOffer(token: string, now = new Date()): Promise<PublicOffer | null> {
  if (!isOfferToken(token)) return null;
  const offer = await db.salesOffer.findUnique({
    where: { token },
    select: { token: true, status: true, wasIssued: true, language: true, issuedAt: true, validUntil: true, pdfUrl: true, snapshot: true, developerId: true, unitId: true },
  });
  const snap = offer && asSnapshot(offer.snapshot);
  // Never issued (waiting for approval, or rejected): the link doesn't open. Rejecting also changes the token.
  if (!offer || !snap || offer.status === "PENDING_APPROVAL" || !offer.wasIssued) return null;
  const unit = offer.unitId ? await db.unit.findFirst({ where: { id: offer.unitId, ...salesUnitWhere(offer.developerId) }, select: { availability: true } }) : null;
  const banner = clientBanner({ status: offer.status, validUntil: offer.validUntil, unitTaken: !unit || unit.availability !== "AVAILABLE" }, now);
  return { token: offer.token, language: offer.language, issuedAt: offer.issuedAt, validUntil: offer.validUntil, pdfUrl: offer.pdfUrl, banner, snap: publicSnapshot(snap) };
}
