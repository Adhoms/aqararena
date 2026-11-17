/**
 * Two salespeople press «احجز» on the same unit at the same moment: exactly one may win (spec
 * section 11). Runs the real createHold on two separate database connections. It refuses any
 * database that isn't on this machine, so it can't touch the live one.
 *
 *   node --conditions=react-server --env-file=.env --import tsx scripts/hold-race.ts
 *
 * Needs `npx prisma migrate deploy` and `npm run db:seed` first. Cleans up after itself.
 *
 * What it proves depends on the database. The local `prisma dev` database is PGlite behind
 * pglite-socket, which runs one transaction at a time across all connections. There the script
 * proves that exactly one hold wins, that the loser is told who holds the unit, and that the partial
 * unique index refuses a second ACTIVE hold with P2002. It does NOT prove a real `FOR UPDATE` wait or
 * truly concurrent inserts: the two transactions never overlap. Run it once against a real
 * PostgreSQL on localhost (e.g. a Docker `postgres` container, migrated and seeded) to prove those.
 */
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { createHold } from "../src/lib/sales/hold-service";

const ROUNDS = 8;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
    throw new Error("hold-race: DATABASE_URL must point at a throwaway database on this machine.");
  }
  // Two clients with one connection each, so the two holds really run side by side.
  const connect = () => new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1 }) });
  const [a, b] = [connect(), connect()];
  const tag = `race-${Date.now()}`;
  try {
    const candidates = await a.unit.findMany({
      where: { availability: "AVAILABLE", holds: { none: { status: "ACTIVE" } }, typology: { priceFrom: { not: null }, project: { published: true } } },
      select: { id: true, typology: { select: { project: { select: { developerId: true } } } } },
      take: 200,
    });
    assert.ok(candidates.length > 0, "no available unit in a published project: run npm run db:seed first");
    const developerId = candidates[0].typology.project.developerId;
    const units = candidates.filter((u) => u.typology.project.developerId === developerId).slice(0, ROUNDS);
    const make = (suffix: string) =>
      a.salesAccount.create({ data: { developerId, username: `${tag}-${suffix}`, passwordHash: "x", nameAr: `${tag}-${suffix}`, phone: "01000000000", mustChangePassword: false } });
    const [one, two] = [await make("a"), await make("b")];
    // The loser hears who won: from the check under the unit lock, or from the index (P2002) if it got past it.
    const loserMessage = new RegExp(`^(محجوزة مؤقتًا لـ ${tag}-[ab] لحد |الوحدة لسه اتحجزت لـ ${tag}-[ab]$)`);
    for (const unit of units) {
      const results = await Promise.all([
        createHold({ account: { id: one.id, role: "AGENT", developerId }, unitId: unit.id, clientNote: null }, { client: a }),
        createHold({ account: { id: two.id, role: "AGENT", developerId }, unitId: unit.id, clientNote: null }, { client: b }),
      ]);
      assert.equal(results.filter((r) => r.ok).length, 1, `unit ${unit.id}: ${JSON.stringify(results)}`);
      const loser = results.find((r) => !r.ok)!;
      assert.match(loser.message, loserMessage);
      assert.equal(await a.unitHold.count({ where: { unitId: unit.id, status: "ACTIVE" } }), 1);
    }
    // The index on its own, without the service's lock: a second ACTIVE hold row is refused.
    await assert.rejects(
      b.unitHold.create({ data: { unitId: units[0].id, salesAccountId: two.id, expiresAt: new Date(Date.now() + 3_600_000) } }),
      (e) => {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) return false;
        const index = (e.meta as { driverAdapterError?: { cause?: { constraint?: { index?: string } } } }).driverAdapterError?.cause?.constraint?.index;
        return index === undefined || index === "UnitHold_unitId_active_key";
      },
    );
    console.log(`hold-race OK: ${units.length} rounds, exactly one hold won each time; the index refuses a second active hold.`);
  } finally {
    try {
      const accounts = { username: { startsWith: tag } };
      await a.unitHold.deleteMany({ where: { OR: [{ salesAccount: accounts }, { releasedBy: accounts }] } });
      await a.salesAccount.deleteMany({ where: accounts });
    } catch (e) {
      console.error("hold-race: cleanup failed", e);
    }
    await Promise.all([a.$disconnect(), b.$disconnect()]);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
