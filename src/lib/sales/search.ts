import { isSubType, isUnitView, type SubType, type UnitView } from "@/lib/property";
import { BUDGET_BASES, type BudgetBasis } from "./budget";
import { SALES_STATES, type SalesState } from "./holds";

// The Sales inventory search lives in the URL (/sales?project=…&beds=3&budget=…), so a salesperson
// can send a search to a colleague. Unknown or malformed values are dropped, never trusted; ids are
// checked against the salesperson's own company by the page.

export type SalesSearch = {
  project?: string;
  /** A unit type of the chosen project. */
  model?: string;
  type?: SubType;
  /** 5 means five or more. */
  beds?: number;
  floorMin?: number;
  floorMax?: number;
  view?: UnitView;
  state?: SalesState;
  budget?: number;
  by: BudgetBasis;
  /** A plan of the chosen project, for a down payment or monthly budget. */
  plan?: string;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const id = (v: string | string[] | undefined) => {
  const s = one(v);
  return s && /^[a-z0-9]{10,40}$/i.test(s) ? s : undefined;
};
/** A whole number typed with Western, Arabic-Indic or Persian digits, commas or spaces, within [min, max]. Decimals are accepted, and rounded down, only when `decimals` is set (the budget). */
const int = (v: string | string[] | undefined, min: number, max: number, decimals = false) => {
  const s = one(v)
    ?.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\u066B/g, ".")
    .replace(/[,\s\u066C]/g, "");
  if (!s || !(decimals ? /^\d+(\.\d+)?$/ : /^-?\d+$/).test(s)) return undefined;
  const n = decimals ? Math.floor(Number(s)) : Number(s);
  return n >= min && n <= max ? n : undefined;
};
const isState = (v: string | undefined): v is SalesState => (SALES_STATES as readonly string[]).includes(v ?? "");
const isBasis = (v: string | undefined): v is BudgetBasis => (BUDGET_BASES as readonly string[]).includes(v ?? "");

/** URL parameters → a search. Keys that aren't set are left out (not undefined), so searches compare cleanly. */
export function readSalesSearch(params: Params): SalesSearch {
  const type = one(params.type);
  const view = one(params.view);
  const state = one(params.state);
  const by = one(params.by);
  const project = id(params.project);
  let floorMin = int(params.floorMin, -5, 200);
  let floorMax = int(params.floorMax, -5, 200);
  if (floorMin !== undefined && floorMax !== undefined && floorMin > floorMax) [floorMin, floorMax] = [floorMax, floorMin];
  const out: SalesSearch = {
    project,
    // A unit type or plan only means something inside the chosen project.
    model: project ? id(params.model) : undefined,
    type: isSubType(type) ? type : undefined,
    beds: int(params.beds, 1, 5),
    floorMin,
    floorMax,
    view: isUnitView(view) ? view : undefined,
    state: isState(state) ? state : undefined,
    budget: int(params.budget, 1, 100_000_000_000, true),
    by: isBasis(by) ? by : "total",
    plan: project ? id(params.plan) : undefined,
    page: int(params.page, 1, 10_000) ?? 1,
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as SalesSearch;
}

const KEYS = ["project", "model", "type", "beds", "floorMin", "floorMax", "view", "state", "budget", "by", "plan", "page"] as const;

/** The /sales URL for a search, with `changes` applied (an undefined value clears that filter). */
export function searchHref(search: SalesSearch, changes: Partial<SalesSearch> = {}): string {
  const next: SalesSearch = { ...search, ...changes };
  const query = new URLSearchParams();
  for (const key of KEYS) {
    const value = next[key];
    if (value === undefined || value === "") continue;
    if (key === "page" && value === 1) continue;
    if (key === "by" && (value === "total" || next.budget === undefined)) continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `/sales?${qs}` : "/sales";
}

/** Filters set in the filters box (the project is picked with the chips above it). */
export function activeFilterCount(s: SalesSearch): number {
  const floor = s.floorMin !== undefined || s.floorMax !== undefined;
  return [s.model, s.type, s.beds, s.view, s.state, s.budget].filter((v) => v !== undefined).length + (floor ? 1 : 0);
}
