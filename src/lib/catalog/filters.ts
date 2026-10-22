import type { AreaSlug, ProjectStatus, PropertyCategory } from "@/lib/property";
import { summarize } from "./summary";
import type { Developer, Project } from "./types";

export const SORTS = ["newest", "price", "down", "delivery"] as const;
export type Sort = (typeof SORTS)[number];

export type ProjectFilters = {
  q?: string;
  category?: PropertyCategory;
  areas?: AreaSlug[];
  developer?: string;
  statuses?: ProjectStatus[];
  deliveryBy?: number;
  maxDownPct?: number;
  minYears?: number;
  sort?: Sort;
};

export function sortProjects(list: Project[], sort: Sort = "newest"): Project[] {
  const by: Record<Sort, (a: Project, b: Project) => number> = {
    newest: (a, b) => (b.launchYear ?? 0) - (a.launchYear ?? 0),
    price: (a, b) => summarize(a).startingPrice - summarize(b).startingPrice,
    down: (a, b) => summarize(a).minDownPct - summarize(b).minDownPct,
    delivery: (a, b) => a.deliveryYear - b.deliveryYear,
  };
  return [...list].sort(by[sort]);
}

/** Same rules as the database query in db-source.ts, for the demo data. */
export function filterProjects(list: Project[], developers: Developer[], f: ProjectFilters): Project[] {
  const q = f.q?.trim().toLowerCase();
  const devNames = new Map(developers.map((d) => [d.slug, `${d.name.ar} ${d.name.en}`.toLowerCase()]));
  return list.filter((p) => {
    const s = summarize(p);
    if (q && !`${p.name.ar} ${p.name.en} ${devNames.get(p.developerSlug) ?? ""}`.toLowerCase().includes(q)) return false;
    if (f.category && !p.categories.includes(f.category)) return false;
    if (f.areas?.length && !f.areas.includes(p.areaSlug)) return false;
    if (f.developer && p.developerSlug !== f.developer) return false;
    if (f.statuses?.length && !f.statuses.includes(p.status)) return false;
    if (f.deliveryBy && p.deliveryYear > f.deliveryBy) return false;
    if (f.maxDownPct && s.minDownPct > f.maxDownPct) return false;
    if (f.minYears && s.maxYears < f.minYears) return false;
    return true;
  });
}
