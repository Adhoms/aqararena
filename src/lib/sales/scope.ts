import type { Prisma } from "@/generated/prisma/client";

// The one rule for what AqarArena Sales shows a developer's salespeople: a unit of that developer's,
// in a published project, of a unit type with a starting price (the public catalog's rule too).
// Every Sales read and the hold actions go through these, and a unit that stops matching loses its
// holds (src/lib/sales/hold-service.ts releaseHoldsOutOfSales). Pure, so it is unit-tested.

/** A unit type visible to Sales for `developerId`. */
export function salesTypologyWhere(developerId: string): Prisma.TypologyWhereInput {
  return { priceFrom: { not: null }, project: { developerId, published: true } };
}

/** A unit visible to Sales for `developerId`. */
export function salesUnitWhere(developerId: string): Prisma.UnitWhereInput {
  return { typology: salesTypologyWhere(developerId) };
}

/** What decides whether a hold still belongs in Sales. */
export type HoldScopeFacts = {
  /** The developer of the salesperson who holds the unit. */
  holderDeveloperId: string;
  /** The developer of the held unit's project, and whether the project is published and the type priced. */
  unitDeveloperId: string;
  published: boolean;
  priced: boolean;
};

/** A hold counts only while its unit is visible to Sales for the holder's own developer. */
export const holdInSales = (h: HoldScopeFacts) => h.holderDeveloperId === h.unitDeveloperId && h.published && h.priced;

/**
 * Whether saving a project takes its units out of Sales: it moves to another developer, or ends up
 * unpublished. `published` undefined means the save leaves it as it was (e.g. an import without the column).
 */
export const projectLeavesSales = (before: { developer: string; published: boolean }, after: { developer: string; published?: boolean }) =>
  after.developer !== before.developer || (after.published ?? before.published) === false;
