import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { liveHoldWhere, releaseExpired } from "./hold-service";
import type { HoldActor } from "./holds";

// What /sales/holds reads. Scope: an agent sees only their own holds; a team lead also sees the live
// holds of the other salespeople of their own developer, and nobody else's.

const DAY = 24 * 60 * 60 * 1000;
/** How far back "how my holds ended" looks, by the day the hold was made. */
export const RECENT_DAYS = 30;
/** At most this many finished holds are listed; the page says so when it hits it. */
export const RECENT_LIMIT = 100;

const select = {
  id: true,
  unitId: true,
  salesAccountId: true,
  clientNote: true,
  expiresAt: true,
  createdAt: true,
  status: true,
  releaseReason: true,
  releasedById: true,
  salesAccount: { select: { nameAr: true } },
  releasedBy: { select: { nameAr: true } },
  unit: {
    select: {
      building: true,
      unitNumber: true,
      typology: { select: { code: true, nameAr: true, subType: true, project: { select: { nameAr: true } } } },
    },
  },
} satisfies Prisma.UnitHoldSelect;
export type HoldRow = Prisma.UnitHoldGetPayload<{ select: typeof select }>;

export type MyHolds = {
  /** My live holds, the soonest to end first. */
  mine: HoldRow[];
  /** My converted and released holds made in the last 30 days, newest first. */
  recent: HoldRow[];
  /** Team leads only: the other salespeople's live holds, the soonest to end first. */
  team: HoldRow[];
};

/** Only units the unit page still opens (a published project, a priced type), so no link here leads to "not found". */
const published = { unit: { typology: { priceFrom: { not: null }, project: { published: true } } } } satisfies Prisma.UnitHoldWhereInput;

export async function myHolds(me: HoldActor, now = new Date()): Promise<MyHolds> {
  // Expired holds are marked released the first time someone looks.
  await releaseExpired(db, { salesAccount: { developerId: me.developerId } }, now);
  const [mine, recent, team] = await Promise.all([
    db.unitHold.findMany({ where: { salesAccountId: me.id, ...published, ...liveHoldWhere(now) }, orderBy: [{ expiresAt: "asc" }, { id: "asc" }], select }),
    db.unitHold.findMany({
      where: {
        salesAccountId: me.id,
        ...published,
        status: { in: ["CONVERTED", "RELEASED"] },
        createdAt: { gte: new Date(now.getTime() - RECENT_DAYS * DAY) },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: RECENT_LIMIT,
      select,
    }),
    me.role === "LEAD"
      ? db.unitHold.findMany({
          where: { salesAccount: { developerId: me.developerId }, NOT: { salesAccountId: me.id }, ...published, ...liveHoldWhere(now) },
          orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
          select,
        })
      : Promise.resolve([] as HoldRow[]),
  ]);
  return { mine, recent, team };
}
