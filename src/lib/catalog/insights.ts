import type { AreaSlug } from "@/lib/property";
import { inEgp, summarize } from "./summary";
import type { Project } from "./types";

// Market figures computed from the projects listed on AqarArena (not the whole market).
// Shown with that caveat wherever they appear. Only projects priced in pounds take part: prices in
// another currency can't be averaged or ranked with them, so those projects have no value entry.

export type AreaInsight = {
  area: AreaSlug;
  projects: number;
  avgPricePerM2: number;
  lowestStartingPrice: number;
};

export type ProjectValue = {
  /** Project's average price per m² compared with its area's, in percent (negative = cheaper). */
  vsAreaPct: number;
  /** 0–10: price per m² against the area (60%), lowest down payment (20%), longest term (20%). */
  score: number;
  /** Rank by price per m² inside its area, 1 = cheapest. */
  areaRank: number;
  areaCount: number;
};

export type MarketInsights = {
  areas: AreaInsight[];
  /** By project slug; projects in another currency than pounds have none. */
  values: Partial<Record<string, ProjectValue>>;
  maxAvgPricePerM2: number;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function computeInsights(projects: Project[]): MarketInsights {
  const byArea = new Map<AreaSlug, Project[]>();
  for (const p of projects.filter(inEgp)) byArea.set(p.areaSlug, [...(byArea.get(p.areaSlug) ?? []), p]);

  const areas: AreaInsight[] = [...byArea.entries()]
    .map(([area, list]) => {
      const sums = list.map(summarize);
      return {
        area,
        projects: list.length,
        avgPricePerM2: Math.round(sums.reduce((a, s) => a + s.avgPricePerM2, 0) / sums.length / 100) * 100,
        lowestStartingPrice: Math.min(...sums.map((s) => s.startingPrice)),
      };
    })
    .sort((a, b) => b.avgPricePerM2 - a.avgPricePerM2);

  const areaAvg = new Map(areas.map((a) => [a.area, a.avgPricePerM2]));
  const values: Record<string, ProjectValue> = {};
  for (const [, list] of byArea) {
    const ranked = [...list].sort((a, b) => summarize(a).avgPricePerM2 - summarize(b).avgPricePerM2);
    ranked.forEach((p, i) => {
      const s = summarize(p);
      const avg = areaAvg.get(p.areaSlug) ?? s.avgPricePerM2;
      const vsAreaPct = Math.round(((s.avgPricePerM2 - avg) / avg) * 100);
      const priceScore = clamp(5 - vsAreaPct / 5, 0, 10);
      const downScore = clamp(10 - s.minDownPct / 2, 0, 10);
      const termScore = clamp(s.maxYears, 0, 10);
      values[p.slug] = {
        vsAreaPct,
        score: Math.round((0.6 * priceScore + 0.2 * downScore + 0.2 * termScore) * 10) / 10,
        areaRank: i + 1,
        areaCount: list.length,
      };
    });
  }

  return { areas, values, maxAvgPricePerM2: Math.max(0, ...areas.map((a) => a.avgPricePerM2)) };
}
