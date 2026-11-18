import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@/generated/prisma/client";
import { isActiveHoldClash, isBusy, pgCode } from "./hold-errors";

// Errors shaped the way Prisma 7.10 builds them from @prisma/adapter-pg's DriverAdapterError
// (node_modules/@prisma/client/runtime and @prisma/adapter-pg convertDriverError).
const known = (code: string, cause?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError(`test ${code}`, {
    code,
    clientVersion: "7.10.1",
    meta: cause ? { driverAdapterError: { name: "DriverAdapterError", cause } } : undefined,
  });
/** Any Postgres error the adapter doesn't name: P2010 from a raw query, P2039 from a regular one. */
const postgres = (prismaCode: "P2010" | "P2039", pg: string) =>
  known(prismaCode, { originalCode: pg, originalMessage: "…", kind: "postgres", code: pg, severity: "ERROR", message: "…" });
const deadlock = () => known("P2034", { originalCode: "40P01", originalMessage: "deadlock detected", kind: "TransactionWriteConflict" });
const unique = (constraint?: { index: string } | { fields: string[] }) =>
  known("P2002", { originalCode: "23505", originalMessage: "duplicate key", kind: "UniqueConstraintViolation", constraint, table: "UnitHold" });

test("the Postgres code comes from the adapter's cause, or from a raw driver error", () => {
  assert.equal(pgCode(postgres("P2010", "55P03")), "55P03");
  assert.equal(pgCode(postgres("P2039", "55P03")), "55P03");
  assert.equal(pgCode(deadlock()), "40P01");
  assert.equal(pgCode(unique({ index: "UnitHold_unitId_active_key" })), "23505");
  assert.equal(pgCode({ code: "55P03", message: "lock timeout", severity: "ERROR" }), "55P03");
  assert.equal(pgCode({ cause: { originalCode: "40P01" } }), "40P01");
  // Prisma's own code is never mistaken for a Postgres one.
  assert.equal(pgCode(known("P2028")), undefined);
  assert.equal(pgCode(null), undefined);
  assert.equal(pgCode(new Error("boom")), undefined);
});

test("busy: a lock wait that timed out, a deadlock, or a transaction that ran out of time", () => {
  assert.equal(isBusy(postgres("P2010", "55P03")), true, "lock_timeout in the raw FOR UPDATE");
  assert.equal(isBusy(postgres("P2039", "55P03")), true, "lock_timeout in a regular query");
  assert.equal(isBusy(deadlock()), true);
  assert.equal(isBusy(known("P2034")), true);
  assert.equal(isBusy(known("P2028")), true);
  assert.equal(isBusy({ code: "40P01", message: "deadlock", severity: "ERROR" }), true);
});

test("not busy: other failures are real errors", () => {
  assert.equal(isBusy(postgres("P2010", "42601")), false, "a syntax error");
  assert.equal(isBusy(unique({ index: "UnitHold_unitId_active_key" })), false);
  assert.equal(isBusy(known("P2025")), false);
  assert.equal(isBusy(new Error("boom")), false);
  assert.equal(isBusy(undefined), false);
});

test("a second ACTIVE hold is the partial unique index refusing it", () => {
  assert.equal(isActiveHoldClash(unique({ index: "UnitHold_unitId_active_key" })), true);
  // The adapter couldn't say which index: on a hold insert, any unique violation counts.
  assert.equal(isActiveHoldClash(unique()), true);
  assert.equal(isActiveHoldClash(known("P2002")), true);
  assert.equal(isActiveHoldClash(unique({ fields: ["id"] })), true, "named by fields only: the index is unknown");
});

test("another named unique index, or no unique violation at all, isn't a hold clash", () => {
  assert.equal(isActiveHoldClash(unique({ index: "UnitHold_pkey" })), false);
  assert.equal(isActiveHoldClash(postgres("P2010", "23505")), false, "a raw query's unique violation isn't P2002");
  assert.equal(isActiveHoldClash(deadlock()), false);
  assert.equal(isActiveHoldClash({ code: "P2002" }), false, "not a Prisma error");
});
