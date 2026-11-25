import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { priceSnapshot } from "./price-alerts";
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
    // One query after the other: `client` may be a transaction, whose one connection takes no parallel queries.
    const types = await client.typology.findMany({ where: { projectId, priceFrom: { not: null } }, select: { id: true, priceFrom: true, buaM2: true } });
    const history = await client.priceHistory.findMany({
      where: { projectId, recordedAt: { lt: day } },
      orderBy: { recordedAt: "desc" },
      select: { typologyId: true, pricePerM2: true },
    });
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

/**
 * For projects whose currency just changed: their earlier prices were in the other currency, so the
 * history starts again from today's figures, and the price-alert snapshot is replaced by today's figures
 * too, so the change itself sends no alert. Call it in the transaction that changes the currency, after
 * the prices are written.
 */
export async function restartPriceTracking(projectIds: string[], client: Prisma.TransactionClient | typeof db = db) {
  for (const projectId of new Set(projectIds)) {
    await client.priceHistory.deleteMany({ where: { projectId } });
    await recordPriceHistory([projectId], client);
    const now = await priceSnapshot(projectId, client);
    await client.project.update({ where: { id: projectId }, data: { alertSnapshot: now ?? Prisma.DbNull } });
  }
}
