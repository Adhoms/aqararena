import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { formatDateTimeAr } from "@/lib/format";
import { isActiveHoldClash, isBusy } from "./hold-errors";
import { canCancelHold, canConvertHold, effectiveHoldHours, holdExpiry, type AvailabilityValue, type HoldActor, type HoldFacts } from "./holds";
import { holdInSales, salesUnitWhere } from "./scope";

// Temporary holds (spec section 6). Creating and converting a hold each run in one transaction that
// locks the unit row first: a portal or admin status change also updates the unit row before it
// releases holds, and a change that takes units out of Sales (project moved or unpublished, type
// without a price) locks them before releasing their holds, so the two wait for each other instead of
// leaving a live hold behind, and they never deadlock. Cancelling only ends a hold and never touches
// the unit, so it needs no lock. The partial unique index "UnitHold_unitId_active_key" is the real
// guarantee of one hold per unit.
//
// A hold counts only while Sales shows its unit to the holder's own developer (src/lib/sales/scope.ts).
// The writes that break that release the hold in the same transaction (OUT_OF_SALES); every Sales read
// also checks the holder's developer, so a hold that slipped through is never shown across companies.

type Client = typeof db;
type Tx = Prisma.TransactionClient;
export type HoldResult = { ok: boolean; message: string };
type Options = { client?: Client; now?: Date };

/**
 * Starts a hold transaction. The admin's workbook import can keep unit rows locked for up to two
 * minutes; a hold waits at most 3 seconds for a unit row (or for a competing insert), then tells the
 * salesperson to try again.
 */
export const limitLockWait = (tx: Tx) => tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
/** Both comfortably longer than the 3-second lock wait, so that fails first, with a clear answer. */
export const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 };
export const BUSY: HoldResult = { ok: false, message: "الوحدة بتتحدّث دلوقتي، جرّب تاني بعد شوية" };

/** Holds that still count: ACTIVE and not yet expired. */
export function liveHoldWhere(now = new Date()): Prisma.UnitHoldWhereInput {
  return { status: "ACTIVE", expiresAt: { gt: now } };
}

/** Live holds that count on `developerId`'s units: held by one of that developer's own salespeople. */
export function salesHoldWhere(developerId: string, now = new Date()): Prisma.UnitHoldWhereInput {
  return { ...liveHoldWhere(now), salesAccount: { developerId } };
}

/** Live holds that count on one project's units: held by a salesperson of the developer that owns the project. */
function projectHoldWhere(projectId: string, now: Date): Prisma.UnitHoldWhereInput {
  return { ...liveHoldWhere(now), salesAccount: { developer: { projects: { some: { id: projectId } } } } };
}

/** For a project's units query (admin and portal pages): `holds: projectUnitHolds(projectId)` gives each unit's live hold, if any. */
export function projectUnitHolds(projectId: string, now = new Date()) {
  return { where: projectHoldWhere(projectId, now), take: 1, select: { expiresAt: true, salesAccount: { select: { nameAr: true } } } } satisfies Prisma.Unit$holdsArgs;
}

/** How many of a project's units have a live hold (the pages list only the first units). */
export function projectLiveHoldCount(projectId: string, now = new Date()) {
  return db.unitHold.count({ where: { ...projectHoldWhere(projectId, now), unit: { typology: { projectId } } } });
}

/** How many of these units have a live hold, for an import's warning before saving. */
export function liveHoldCount(units: Prisma.UnitWhereInput, now = new Date()) {
  return db.unitHold.count({ where: { ...liveHoldWhere(now), unit: units } });
}

/** Marks the expired ACTIVE holds among `where` as RELEASED (EXPIRED): "released the first time something touches it". */
export function releaseExpired(client: Client | Tx, where: Prisma.UnitHoldWhereInput, now = new Date()) {
  return client.unitHold.updateMany({
    where: { AND: [where, { status: "ACTIVE", expiresAt: { lte: now } }] },
    data: { status: "RELEASED", releaseReason: "EXPIRED" },
  });
}

/** Takes a row lock on the unit for the rest of the transaction. */
export const lockUnit = (tx: Tx, unitId: string) => tx.$queryRaw`SELECT "id" FROM "Unit" WHERE "id" = ${unitId} FOR UPDATE`;

/**
 * Locks every unit matching `where`, in id order, and returns their ids. Every write that changes
 * many units takes their locks this way first, before writing any unit, so two of them never deadlock.
 */
export async function lockUnits(tx: Tx, where: Prisma.UnitWhereInput): Promise<string[]> {
  const ids = (await tx.unit.findMany({ where, orderBy: { id: "asc" }, select: { id: true } })).map((u) => u.id);
  if (ids.length) await tx.$queryRaw`SELECT "id" FROM "Unit" WHERE "id" = ANY(${ids}) ORDER BY "id" FOR UPDATE`;
  return ids;
}

/** Releases the ACTIVE holds on these (locked) units that Sales no longer shows to the holder's developer. */
async function releaseStrayHolds(tx: Tx, unitIds: string[]): Promise<number> {
  const active = await tx.unitHold.findMany({
    where: { unitId: { in: unitIds }, status: "ACTIVE" },
    select: {
      id: true,
      salesAccount: { select: { developerId: true } },
      unit: { select: { typology: { select: { priceFrom: true, project: { select: { developerId: true, published: true } } } } } },
    },
  });
  const stray = active
    .filter(
      (h) =>
        !holdInSales({
          holderDeveloperId: h.salesAccount.developerId,
          unitDeveloperId: h.unit.typology.project.developerId,
          published: h.unit.typology.project.published,
          priced: h.unit.typology.priceFrom !== null,
        }),
    )
    .map((h) => h.id);
  if (!stray.length) return 0;
  const { count } = await tx.unitHold.updateMany({ where: { id: { in: stray }, status: "ACTIVE" }, data: { status: "RELEASED", releaseReason: "OUT_OF_SALES" } });
  return count;
}

/**
 * After a write that can take units out of a developer's Sales inventory (a project moved to another
 * developer or unpublished, a unit type left without a price, a unit moved to such a type), releases
 * the holds on the units matching `units` that no longer belong in Sales. Call it inside the
 * transaction that made the change, after the change. It locks those units first, so a hold being
 * made on one right now either finishes first and is released here, or waits and sees the change.
 * Returns how many live holds it released.
 */
export async function releaseHoldsOutOfSales(tx: Tx, units: Prisma.UnitWhereInput, now = new Date()): Promise<number> {
  const ids = await lockUnits(tx, units);
  if (!ids.length) return 0;
  await releaseExpired(tx, { unitId: { in: ids } }, now);
  return releaseStrayHolds(tx, ids);
}

/** When a salesperson's account is disabled: releases their holds. Call it in the transaction that disables the account, after the update. */
export async function releaseHoldsOfAccount(tx: Tx, salesAccountId: string, now = new Date()): Promise<number> {
  await releaseExpired(tx, { salesAccountId }, now);
  const { count } = await tx.unitHold.updateMany({ where: { salesAccountId, status: "ACTIVE" }, data: { status: "RELEASED", releaseReason: "ACCOUNT_DISABLED" } });
  return count;
}

const OWN: HoldResult = { ok: false, message: "الوحدة دي محجوزة ليك بالفعل" };

/** Holds `unitId` for the salesperson, for the project's (or developer's) hold hours. */
export async function createHold(
  input: { account: HoldActor; unitId: string; clientNote: string | null },
  { client = db, now = new Date() }: Options = {},
): Promise<HoldResult> {
  const { account, unitId, clientNote } = input;
  try {
    return await client.$transaction(async (tx): Promise<HoldResult> => {
      await limitLockWait(tx);
      // 1. Lock the unit, then check under the lock that Sales shows it to this developer (the rule in
      //    scope.ts). A change that takes it out of Sales locks it too before releasing holds
      //    (releaseHoldsOutOfSales), so either that change waits and releases this hold, or this check
      //    runs after it and sees it.
      await lockUnit(tx, unitId);
      const unit = await tx.unit.findFirst({
        where: { id: unitId, ...salesUnitWhere(account.developerId) },
        select: { availability: true, typology: { select: { project: { select: { holdHours: true, developer: { select: { holdHours: true } } } } } } },
      });
      if (!unit) return { ok: false, message: "الوحدة دي مش موجودة في مشروعات شركتك" };
      // 2. The salesperson's account must still be on. The share lock makes disabling the account
      //    (which releases its holds) wait for this hold, or this wait for it and see it disabled.
      const active = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "SalesAccount"
        WHERE "id" = ${account.id} AND "developerId" = ${account.developerId} AND "status" = 'ACTIVE'
        FOR SHARE`;
      if (!active.length) return { ok: false, message: "حسابك اتوقف. كلّم الشركة" };
      // 3. A hold whose time ran out no longer blocks the unit, and neither does one left from before
      //    the unit came to this developer (it should have been released then).
      await releaseExpired(tx, { unitId }, now);
      await releaseStrayHolds(tx, [unitId]);
      // 4. Only an available unit can be held (checked first, so a sold unit never reads as "held by X").
      if (unit.availability !== "AVAILABLE") return { ok: false, message: "الوحدة دي مش متاحة دلوقتي" };
      // 5. A live hold (a colleague's) blocks it: say whose, and until when.
      const live = await tx.unitHold.findFirst({
        where: { unitId, ...liveHoldWhere(now) },
        select: { salesAccountId: true, expiresAt: true, salesAccount: { select: { nameAr: true } } },
      });
      if (live) {
        if (live.salesAccountId === account.id) return OWN;
        return { ok: false, message: `محجوزة مؤقتًا لـ ${live.salesAccount.nameAr} لحد ${formatDateTimeAr(live.expiresAt)}` };
      }
      const project = unit.typology.project;
      const expiresAt = holdExpiry(now, effectiveHoldHours(project.holdHours, project.developer.holdHours));
      // 6. Insert. The partial unique index refuses a second ACTIVE hold (P2002) if one slipped past the lock.
      await tx.unitHold.create({ data: { unitId, salesAccountId: account.id, clientNote, expiresAt } });
      return { ok: true, message: `اتحجزت ليك ✓ لحد ${formatDateTimeAr(expiresAt)}` };
    }, TX_OPTIONS);
  } catch (e) {
    if (isBusy(e)) return BUSY;
    if (!isActiveHoldClash(e)) throw e;
    // 7. The backstop: someone else's hold got there first.
    const winner = await client.unitHold.findFirst({
      where: { unitId, status: "ACTIVE" },
      select: { salesAccountId: true, salesAccount: { select: { nameAr: true } } },
    });
    if (winner?.salesAccountId === account.id) return OWN;
    return { ok: false, message: `الوحدة لسه اتحجزت لـ ${winner?.salesAccount.nameAr ?? "زميل"}` };
  }
}

/** A hold by one of this developer's salespeople, on a unit Sales shows this developer, with what the rules need. */
async function findHold(client: Client, developerId: string, holdId: string): Promise<(HoldFacts & { id: string; unitId: string }) | null> {
  const h = await client.unitHold.findFirst({
    where: { id: holdId, salesAccount: { developerId }, unit: salesUnitWhere(developerId) },
    select: { id: true, unitId: true, salesAccountId: true, status: true, expiresAt: true, unit: { select: { typology: { select: { project: { select: { developerId: true } } } } } } },
  });
  return h && { id: h.id, unitId: h.unitId, salesAccountId: h.salesAccountId, status: h.status, expiresAt: h.expiresAt, developerId: h.unit.typology.project.developerId };
}

const GONE: HoldResult = { ok: false, message: "الحجز ده مش موجود" };
const OVER: HoldResult = { ok: false, message: "الحجز ده خلص وقته أو اتلغى" };

/** The holder confirms: the unit becomes RESERVED and the hold CONVERTED, together. */
export async function convertHold(account: HoldActor, holdId: string, { client = db, now = new Date() }: Options = {}): Promise<HoldResult> {
  const hold = await findHold(client, account.developerId, holdId);
  if (!hold) return GONE;
  if (!canConvertHold(account, hold, now)) {
    return hold.salesAccountId !== account.id ? { ok: false, message: "صاحب الحجز بس هو اللي يقدر يأكده" } : OVER;
  }
  try {
    return await client.$transaction(async (tx): Promise<HoldResult> => {
      await limitLockWait(tx);
      await lockUnit(tx, hold.unitId);
      // Re-checked under the lock. A hold whose time ran out is marked so first.
      await releaseExpired(tx, { id: hold.id }, now);
      const unit = await tx.unit.findFirst({ where: { id: hold.unitId, ...salesUnitWhere(account.developerId) }, select: { availability: true } });
      if (!unit) {
        // The unit left this developer's Sales inventory while the hold was being confirmed.
        const released = await tx.unitHold.updateMany({ where: { id: hold.id, status: "ACTIVE" }, data: { status: "RELEASED", releaseReason: "OUT_OF_SALES" } });
        return released.count ? { ok: false, message: "الوحدة مبقتش معروضة لفريق المبيعات، فالحجز ماتأكدش" } : OVER;
      }
      if (unit.availability !== "AVAILABLE") {
        // The unit left the market without its hold being released: end the hold now, so it doesn't
        // linger as ACTIVE on a reserved or sold unit. Status changes outside Sales are the
        // developer's, so the closest reason is PORTAL_STATUS_CHANGE.
        const released = await tx.unitHold.updateMany({
          where: { id: hold.id, status: "ACTIVE" },
          data: { status: "RELEASED", releaseReason: "PORTAL_STATUS_CHANGE" },
        });
        return released.count ? { ok: false, message: "الوحدة مبقتش متاحة، فالحجز ماتأكدش" } : OVER;
      }
      const converted = await tx.unitHold.updateMany({
        where: { id: hold.id, salesAccountId: account.id, status: "ACTIVE", expiresAt: { gt: now } },
        data: { status: "CONVERTED" },
      });
      if (!converted.count) return OVER;
      await tx.unit.update({ where: { id: hold.unitId }, data: { availability: "RESERVED" } });
      return { ok: true, message: "الحجز اتأكد ✓ الوحدة بقت محجوزة" };
    }, TX_OPTIONS);
  } catch (e) {
    if (isBusy(e)) return BUSY;
    throw e;
  }
}

/** The holder or a team lead cancels: the hold is RELEASED and the unit stays AVAILABLE. */
export async function cancelHold(account: HoldActor, holdId: string, { client = db, now = new Date() }: Options = {}): Promise<HoldResult> {
  const hold = await findHold(client, account.developerId, holdId);
  if (!hold) return GONE;
  if (!canCancelHold(account, hold, now)) {
    return hold.salesAccountId !== account.id && account.role !== "LEAD" ? { ok: false, message: "صاحب الحجز أو قائد الفريق بس هو اللي يقدر يلغيه" } : OVER;
  }
  const { count } = await client.unitHold.updateMany({
    where: { id: hold.id, status: "ACTIVE", expiresAt: { gt: now } },
    data: { status: "RELEASED", releaseReason: "CANCELLED", releasedById: account.id },
  });
  return count ? { ok: true, message: "اتلغى الحجز ✓ الوحدة رجعت متاحة" } : OVER;
}

/**
 * After a portal or admin change, releases the holds on units that are no longer AVAILABLE.
 * Call it inside the transaction that changed the units, after the change (the unit rows are then
 * locked, so no new hold can slip in). Returns how many live holds were released.
 * It trusts the caller: every id must be a unit the caller has already scoped to one developer.
 */
export async function releaseHoldsOfUnavailable(
  tx: Tx,
  units: { id: string; availability: AvailabilityValue }[],
  reason: "PORTAL_STATUS_CHANGE" | "ADMIN_STATUS_CHANGE",
  now = new Date(),
): Promise<number> {
  const ids = units.filter((u) => u.availability !== "AVAILABLE").map((u) => u.id);
  if (!ids.length) return 0;
  await releaseExpired(tx, { unitId: { in: ids } }, now);
  const { count } = await tx.unitHold.updateMany({ where: { unitId: { in: ids }, status: "ACTIVE" }, data: { status: "RELEASED", releaseReason: reason } });
  return count;
}
