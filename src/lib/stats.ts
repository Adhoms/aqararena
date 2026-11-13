import "server-only";
import { db } from "@/lib/db";
import { periodTotals, STAT_EVENTS, type PeriodTotals, type StatEvent } from "./stats-events";

// Daily visitor counters per project. The browser reports each action once per session
// (components/stats/tracker.tsx); nothing about the visitor is stored, only the day's total.
// The figures are estimates: anyone can send a report, so they are not a basis for billing.

const today = () => new Date().toISOString().slice(0, 10);

/** Adds one to today's counter for a published project. Unknown or hidden projects are ignored. */
export async function countEvent(slug: string, event: StatEvent) {
  const project = await db.project.findFirst({ where: { slug, published: true }, select: { id: true } });
  if (!project) return;
  const day = new Date(`${today()}T00:00:00Z`);
  await db.projectStat.upsert({
    where: { projectId_day_event: { projectId: project.id, day, event } },
    create: { projectId: project.id, day, event, count: 1 },
    update: { count: { increment: 1 } },
  });
}

export type ProjectStats = { projectId: string; totals: PeriodTotals; subscribers: number };

/** The last `days` days and the period before, for each project, plus confirmed price-alert subscribers. */
export async function statsFor(projectIds: string[], days = 30): Promise<Map<string, ProjectStats>> {
  const now = today();
  const since = new Date(Date.parse(`${now}T00:00:00Z`) - (days * 2 - 1) * 86_400_000);
  const [rows, subscribers] = await Promise.all([
    db.projectStat.findMany({ where: { projectId: { in: projectIds }, day: { gte: since } }, select: { projectId: true, day: true, event: true, count: true } }),
    db.priceAlert.groupBy({ by: ["projectId"], where: { projectId: { in: projectIds }, confirmedAt: { not: null } }, _count: { _all: true } }),
  ]);
  const subs = new Map(subscribers.map((s) => [s.projectId, s._count._all]));
  const out = new Map<string, ProjectStats>();
  for (const id of projectIds) {
    const mine = rows.filter((r) => r.projectId === id).map((r) => ({ day: r.day.toISOString().slice(0, 10), event: r.event, count: r.count }));
    out.set(id, { projectId: id, totals: periodTotals(mine, now, days), subscribers: subs.get(id) ?? 0 });
  }
  return out;
}

export { STAT_EVENTS };
