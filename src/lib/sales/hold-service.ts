// src/lib/sales/hold-service.ts
import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { formatDateTimeAr } from "@/lib/format";
import { canCancelHold, canConvertHold, effectiveHoldHours, holdExpiry, type HoldActor, type HoldFacts } from "./holds";

// Temporary holds (spec section 6). Each write is one transaction that locks the unit row first:
// a portal or admin status change also updates the unit row before it releases holds, so the two
// wait for each other instead of leaving a live hold on a sold unit, and they never deadlock.
// The partial unique index "UnitHold_unitId_active_key" is the real guarantee of one hold per unit.

type Client = typeof db;
type Tx = Prisma.TransactionClient;
export type HoldResult = { ok: boolean; message: string };
type Options = { client?: Client; now?: Date };

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

/** Thrown inside a transaction to roll it back and answer with `result`. */
class Rollback extends Error {
  constructor(readonly result: HoldResult) {
    super(result.message);
  }
}

/** Holds `unitId` for the salesperson, for the project's (or developer's) hold hours. */
export async function createHold(
  input: { account: HoldActor; unitId: string; clientNote: string | null },
  { client = db, now = new Date() }: Options = {},
): Promise<HoldResult> {
  const { account, unitId, clientNote } = input;
  try {
    return await client.$transaction(async (tx): Promise<HoldResult> => {
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
      // 2. Only an available unit can be held.
      const unit = await tx.unit.findUniqueOrThrow({
        where: { id: unitId },
        select: { availability: true, typology: { select: { project: { select: { holdHours: true, developer: { select: { holdHours: true } } } } } } },
      });
      if (unit.availability !== "AVAILABLE") return { ok: false, message: "الوحدة دي مش متاحة دلوقتي" };
      const project = unit.typology.project;
      const expiresAt = holdExpiry(now, effectiveHoldHours(project.holdHours, project.developer.holdHours));
      // 3. Insert. A live hold by anyone makes this fail on the partial unique index (P2002).
      await tx.unitHold.create({ data: { unitId, salesAccountId: account.id, clientNote, expiresAt } });
      return { ok: true, message: `اتحجزت ليك ✓ لحد ${formatDateTimeAr(expiresAt)}` };
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    // 4. Someone else's hold got there first.
    const winner = await client.unitHold.findFirst({
      where: { unitId, status: "ACTIVE" },
      select: { salesAccountId: true, salesAccount: { select: { nameAr: true } } },
    });
    if (winner?.salesAccountId === account.id) return { ok: false, message: "الوحدة دي محجوزة ليك بالفعل" };
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
      await lockUnit(tx, hold.unitId);
      // Re-checked under the lock: still ACTIVE, still unexpired, still this salesperson's.
      const converted = await tx.unitHold.updateMany({
        where: { id: hold.id, salesAccountId: account.id, status: "ACTIVE", expiresAt: { gt: now } },
        data: { status: "CONVERTED" },
      });
      if (!converted.count) throw new Rollback(OVER);
      const reserved = await tx.unit.updateMany({ where: { id: hold.unitId, availability: "AVAILABLE" }, data: { availability: "RESERVED" } });
      if (!reserved.count) throw new Rollback({ ok: false, message: "الوحدة مبقتش متاحة، فالحجز ماتأكدش" });
      return { ok: true, message: "الحجز اتأكد ✓ الوحدة بقت محجوزة" };
    });
  } catch (e) {
    if (e instanceof Rollback) return e.result;
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
 */
export async function releaseHoldsOfUnavailable(
  tx: Tx,
  units: { id: string; availability: string }[],
  reason: "PORTAL_STATUS_CHANGE" | "ADMIN_STATUS_CHANGE",
  now = new Date(),
): Promise<number> {
  const ids = units.filter((u) => u.availability !== "AVAILABLE").map((u) => u.id);
  if (!ids.length) return 0;
  await releaseExpired(tx, { unitId: { in: ids } }, now);
  const { count } = await tx.unitHold.updateMany({ where: { unitId: { in: ids }, status: "ACTIVE" }, data: { status: "RELEASED", releaseReason: reason } });
  return count;
}

/** Live holds on these units, by unit id: who holds each one and until when. */
export async function liveHoldsByUnit(unitIds: string[], now = new Date()): Promise<Record<string, { name: string; expiresAt: Date }>> {
  if (!unitIds.length) return {};
  const rows = await db.unitHold.findMany({
    where: { unitId: { in: unitIds }, ...liveHoldWhere(now) },
    select: { unitId: true, expiresAt: true, salesAccount: { select: { nameAr: true } } },
  });
  return Object.fromEntries(rows.map((r) => [r.unitId, { name: r.salesAccount.nameAr, expiresAt: r.expiresAt }]));
}
