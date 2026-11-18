import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { changedPoints, currentPoints } from "./price-points";

// Price history: the price per m² of each unit type, and the project's average, on every day it
// changed. Call recordPriceHistory after anything that can move a price (admin forms, the Excel
// import, approving a developer's changes). It writes nothing when the figures are the same.

const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

/**
 * Records today's figures for the projects whose prices differ from the last earlier record.
 * Today's rows are rewritten on every call, so several edits in one day leave one point.
 */
export async function recordPriceHistory(projectIds: string[], client: Prisma.TransactionClient | typeof db = db) {
  const day = today();
  for (const projectId of new Set(projectIds)) {
    const [types, history] = await Promise.all([
      client.typology.findMany({ where: { projectId, priceFrom: { not: null } }, select: { id: true, priceFrom: true, buaM2: true } }),
      client.priceHistory.findMany({
        where: { projectId, recordedAt: { lt: day } },
        orderBy: { recordedAt: "desc" },
        select: { typologyId: true, pricePerM2: true },
      }),
    ]);
    // The newest earlier figure for each unit type and for the project.
    const earlier = new Map<string | null, number>();
    for (const row of history) if (!earlier.has(row.typologyId)) earlier.set(row.typologyId, Number(row.pricePerM2));

    const points = changedPoints(earlier, currentPoints(types.map((t) => ({ id: t.id, priceFrom: Number(t.priceFrom), buaM2: Number(t.buaM2) }))));
    await client.priceHistory.deleteMany({ where: { projectId, recordedAt: day } });
    if (points.length) {
      await client.priceHistory.createMany({ data: points.map((p) => ({ projectId, typologyId: p.typologyId, recordedAt: day, pricePerM2: p.perM2 })) });
    }
  }
}
