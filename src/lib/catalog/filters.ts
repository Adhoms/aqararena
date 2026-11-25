import { finishingsOf, type AreaSlug, type FinishGroup, type ProjectStatus, type PropertyCategory, type SubType } from "@/lib/property";
import { bestBudgetFit, hasBudget } from "./budget";
import { inEgp, summarize } from "./summary";
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
  /** A project matches when one of its unit types has the type, bedrooms, finishing and price asked for. */
  subTypes?: SubType[];
  minBedrooms?: number;
  finishes?: FinishGroup[];
  minPrice?: number;
  maxPrice?: number;
  /** Budget search: cash for the down payment and the highest monthly installment, in EGP. */
  cash?: number;
  monthly?: number;
  sort?: Sort;
};

/** Keeps projects with at least one unit type and plan inside the budget. Used for both data sources. */
export const withinBudget = (list: Project[], f: ProjectFilters): Project[] =>
  hasBudget(f) ? list.filter((p) => bestBudgetFit(p, f)) : list;

export const needsUnitMatch = (f: ProjectFilters) =>
  Boolean(f.subTypes?.length || f.minBedrooms || f.finishes?.length || f.minPrice || f.maxPrice);

export function sortProjects(list: Project[], sort: Sort = "newest"): Project[] {
  const by: Record<Sort, (a: Project, b: Project) => number> = {
    newest: (a, b) => (b.launchYear ?? 0) - (a.launchYear ?? 0),
    // Pounds first, by price; projects in other currencies after them.
    price: (a, b) => Number(!inEgp(a)) - Number(!inEgp(b)) || summarize(a).startingPrice - summarize(b).startingPrice,
    down: (a, b) => summarize(a).minDownPct - summarize(b).minDownPct,
    delivery: (a, b) => a.deliveryYear - b.deliveryYear,
  };
  return [...list].sort(by[sort]);
}

/** Same rules as the database query in db-source.ts, for the demo data. */
export function filterProjects(list: Project[], developers: Developer[], f: ProjectFilters): Project[] {
  const q = f.q?.trim().toLowerCase();
  const devNames = new Map(developers.map((d) => [d.slug, `${d.name.ar} ${d.name.en}`.toLowerCase()]));
  const finishings = f.finishes?.length ? finishingsOf(f.finishes) : undefined;
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
    // A price range is in pounds.
    if ((f.minPrice || f.maxPrice) && !inEgp(p)) return false;
    if (
      needsUnitMatch(f) &&
      !p.typologies.some(
        (t) =>
          (!f.subTypes?.length || f.subTypes.includes(t.subType)) &&
          (!f.minBedrooms || (t.bedrooms ?? 0) >= f.minBedrooms) &&
          (!finishings || finishings.includes(t.finishing)) &&
          (!f.minPrice || t.priceFrom >= f.minPrice) &&
          (!f.maxPrice || t.priceFrom <= f.maxPrice),
      )
    )
      return false;
    return true;
  });
}
