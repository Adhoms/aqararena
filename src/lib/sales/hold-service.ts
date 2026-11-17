import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { formatDateTimeAr } from "@/lib/format";
import { canCancelHold, canConvertHold, effectiveHoldHours, holdExpiry, type AvailabilityValue, type HoldActor, type HoldFacts } from "./holds";

// Temporary holds (spec section 6). Creating and converting a hold each run in one transaction that
// locks the unit row first: a portal or admin status change also updates the unit row before it
// releases holds, so the two wait for each other instead of leaving a live hold on a sold unit, and
// they never deadlock. Cancelling only ends a hold and never touches the unit, so it needs no lock.
// The partial unique index "UnitHold_unitId_active_key" is the real guarantee of one hold per unit.

type Client = typeof db;
type Tx = Prisma.TransactionClient;
export type HoldResult = { ok: boolean; message: string };
type Options = { client?: Client; now?: Date };

/**
 * Starts a hold transaction. The admin's workbook import can keep unit rows locked for up to two
 * minutes; a hold waits at most 3 seconds for a unit row (or for a competing insert), then tells the
 * salesperson to try again.
 */
const limitLockWait = (tx: Tx) => tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
/** Both comfortably longer than the 3-second lock wait, so that fails first, with a clear answer. */
const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 };
const BUSY: HoldResult = { ok: false, message: "الوحدة بتتحدّث دلوقتي، جرّب تاني بعد شوية" };

/** The Postgres error code behind a Prisma error. @prisma/adapter-pg puts it in
 *  `meta.driverAdapterError.cause.originalCode`; a raw driver error carries it as `code`. */
function pgCode(e: unknown): string | undefined {
  type Cause = { originalCode?: unknown; code?: unknown };
  const err = e as { code?: unknown; cause?: Cause; meta?: { driverAdapterError?: { cause?: Cause } } } | null;
  const cause = err?.meta?.driverAdapterError?.cause ?? err?.cause;
  const code = cause?.originalCode ?? cause?.code ?? err?.code;
  return typeof code === "string" ? code : undefined;
}

/** A lock wait that timed out (55P03), a deadlock (40P01, Prisma P2034) or a transaction that ran out
 *  of time or never started (P2028): the unit is being changed by someone else right now. */
function isBusy(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2028" || e.code === "P2034")) return true;
  const code = pgCode(e);
  return code === "55P03" || code === "40P01";
}

/** True when `e` is a second ACTIVE hold refused by "UnitHold_unitId_active_key". When the adapter
 *  doesn't say which index refused it, any unique violation on a hold insert counts. */
function isActiveHoldClash(e: unknown) {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) return false;
  const constraint = (e.meta as { driverAdapterError?: { cause?: { constraint?: { index?: unknown } } } } | undefined)?.driverAdapterError?.cause?.constraint;
  return constraint?.index === undefined || constraint.index === "UnitHold_unitId_active_key";
}

/** Holds that still count: ACTIVE and not yet expired. */
export function liveHoldWhere(now = new Date()): Prisma.UnitHoldWhereInput {
  return { status: "ACTIVE", expiresAt: { gt: now } };
}

/** Marks the expired ACTIVE holds among `where` as RELEASED (EXPIRED): "released the first time something touches it". */
export function releaseExpired(client: Client | Tx, where: Prisma.UnitHoldWhereInput, now = new Date()) {
  return client.unitHold.updateMany({
    where: { AND: [where, { status: "ACTIVE", expiresAt: { lte: now } }] },
    data: { status: "RELEASED", releaseReason: "EXPIRED" },
  });
}

/** Takes a row lock on the unit for the rest of the transaction. */
const lockUnit = (tx: Tx, unitId: string) => tx.$queryRaw`SELECT "id" FROM "Unit" WHERE "id" = ${unitId} FOR UPDATE`;

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
      // Lock the unit, and only if it is this developer's, in a published project, of a priced type.
      const found = await tx.$queryRaw<{ id: string }[]>`
        SELECT u."id" FROM "Unit" u
        JOIN "Typology" t ON t."id" = u."typologyId"
        JOIN "Project" p ON p."id" = t."projectId"
        WHERE u."id" = ${unitId} AND p."developerId" = ${account.developerId}
          AND p."published" = true AND t."priceFrom" IS NOT NULL
        FOR UPDATE OF u`;
      if (!found.length) return { ok: false, message: "الوحدة دي مش موجودة في مشروعات شركتك" };
      // 1. A hold whose time ran out no longer blocks the unit.
      await releaseExpired(tx, { unitId }, now);
      // 2. A live hold (anyone's) blocks it: say whose, and until when.
      const live = await tx.unitHold.findFirst({
        where: { unitId, ...liveHoldWhere(now) },
        select: { salesAccountId: true, expiresAt: true, salesAccount: { select: { nameAr: true } } },
      });
      if (live) {
        if (live.salesAccountId === account.id) return OWN;
        return { ok: false, message: `محجوزة مؤقتًا لـ ${live.salesAccount.nameAr} لحد ${formatDateTimeAr(live.expiresAt)}` };
      }
      // 3. Only an available unit can be held.
      const unit = await tx.unit.findUniqueOrThrow({
        where: { id: unitId },
        select: { availability: true, typology: { select: { project: { select: { holdHours: true, developer: { select: { holdHours: true } } } } } } },
      });
      if (unit.availability !== "AVAILABLE") return { ok: false, message: "الوحدة دي مش متاحة دلوقتي" };
      const project = unit.typology.project;
      const expiresAt = holdExpiry(now, effectiveHoldHours(project.holdHours, project.developer.holdHours));
      // 4. Insert. The partial unique index refuses a second ACTIVE hold (P2002) if one slipped past the lock.
      await tx.unitHold.create({ data: { unitId, salesAccountId: account.id, clientNote, expiresAt } });
      return { ok: true, message: `اتحجزت ليك ✓ لحد ${formatDateTimeAr(expiresAt)}` };
    }, TX_OPTIONS);
  } catch (e) {
    if (isBusy(e)) return BUSY;
    if (!isActiveHoldClash(e)) throw e;
    // 5. The backstop: someone else's hold got there first.
    const winner = await client.unitHold.findFirst({
      where: { unitId, status: "ACTIVE" },
      select: { salesAccountId: true, salesAccount: { select: { nameAr: true } } },
    });
    if (winner?.salesAccountId === account.id) return OWN;
    return { ok: false, message: `الوحدة لسه اتحجزت لـ ${winner?.salesAccount.nameAr ?? "زميل"}` };
  }
}

/** A hold of this developer's units, with what the rules need. */
async function findHold(client: Client, developerId: string, holdId: string): Promise<(HoldFacts & { id: string; unitId: string }) | null> {
  const h = await client.unitHold.findFirst({
    where: { id: holdId, unit: { typology: { project: { developerId } } } },
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
      const unit = await tx.unit.findUniqueOrThrow({ where: { id: hold.unitId }, select: { availability: true } });
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

/**
 * Live holds on these units, by unit id: who holds each one and until when.
 * It trusts the caller: every id must be a unit the caller has already scoped to one developer.
 */
export async function liveHoldsByUnit(unitIds: string[], now = new Date()): Promise<Record<string, { name: string; expiresAt: Date }>> {
  if (!unitIds.length) return {};
  const rows = await db.unitHold.findMany({
    where: { unitId: { in: unitIds }, ...liveHoldWhere(now) },
    select: { unitId: true, expiresAt: true, salesAccount: { select: { nameAr: true } } },
  });
  return Object.fromEntries(rows.map((r) => [r.unitId, { name: r.salesAccount.nameAr, expiresAt: r.expiresAt }]));
}
