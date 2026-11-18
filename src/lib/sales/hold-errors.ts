import { Prisma } from "@/generated/prisma/client";

// How the hold service reads database errors. Kept apart from hold-service.ts (server-only) so the
// shapes Prisma 7 and @prisma/adapter-pg produce are unit-tested.
//
// With the pg adapter, a database error reaches us as a PrismaClientKnownRequestError whose
// `meta.driverAdapterError.cause` carries the Postgres code as `originalCode`:
//   - a unique violation (23505) is P2002, with `cause.constraint.index` naming the index;
//   - a deadlock (40P01) or serialization failure is P2034;
//   - any other Postgres error is P2010 from a raw query, or P2039 from a regular one;
//   - a transaction that ran out of time or never started is P2028 (no Postgres code).

/** The Postgres error code behind a Prisma error. A raw driver error carries it as `code`. */
export function pgCode(e: unknown): string | undefined {
  type Cause = { originalCode?: unknown; code?: unknown };
  const err = e as { code?: unknown; cause?: Cause; meta?: { driverAdapterError?: { cause?: Cause } } } | null;
  const cause = err?.meta?.driverAdapterError?.cause ?? err?.cause;
  // A Prisma error's own `code` is Prisma's (P2010), never Postgres's.
  const code = cause?.originalCode ?? cause?.code ?? (e instanceof Prisma.PrismaClientKnownRequestError ? undefined : err?.code);
  return typeof code === "string" ? code : undefined;
}

/** A lock wait that timed out (55P03), a deadlock (40P01, Prisma P2034) or a transaction that ran out
 *  of time or never started (P2028): the unit is being changed by someone else right now. */
export function isBusy(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2028" || e.code === "P2034")) return true;
  const code = pgCode(e);
  return code === "55P03" || code === "40P01";
}

/** True when `e` is a second ACTIVE hold refused by "UnitHold_unitId_active_key". When the adapter
 *  doesn't say which index refused it, any unique violation on a hold insert counts. */
export function isActiveHoldClash(e: unknown) {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) return false;
  const constraint = (e.meta as { driverAdapterError?: { cause?: { constraint?: { index?: unknown } } } } | undefined)?.driverAdapterError?.cause?.constraint;
  return constraint?.index === undefined || constraint.index === "UnitHold_unitId_active_key";
}
