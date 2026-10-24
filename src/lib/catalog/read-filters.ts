import { isAreaSlug, isProjectStatus, isPropertyCategory, isSubType } from "@/lib/property";
import { SORTS, type ProjectFilters, type Sort } from "./filters";

type Params = Record<string, string | string[] | undefined>;

const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
const one = (v: string | string[] | undefined) => all(v)[0];
const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function paramsFromSearch(search: URLSearchParams): Params {
  const out: Params = {};
  for (const key of new Set(search.keys())) {
    const values = search.getAll(key);
    out[key] = values.length > 1 ? values : values[0];
  }
  return out;
}

/** URL parameters (projects page, smart search links, /api/search) → filters. Unknown values are ignored. */
export function readFilters(params: Params): ProjectFilters {
  const category = one(params.category);
  const sort = one(params.sort);
  return {
    q: one(params.q)?.slice(0, 100),
    category: isPropertyCategory(category) ? category : undefined,
    areas: all(params.area).filter(isAreaSlug),
    developer: one(params.developer),
    statuses: all(params.status).filter(isProjectStatus),
    deliveryBy: num(params.delivery),
    maxDownPct: num(params.down),
    minYears: num(params.years),
    subTypes: all(params.type).filter(isSubType),
    minBedrooms: num(params.beds),
    maxPrice: num(params.max),
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "newest",
  };
}
