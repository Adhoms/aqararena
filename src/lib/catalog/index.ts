import "server-only";
import type { AreaSlug, ProjectStatus, PropertyCategory } from "@/lib/property";
import { developers, projects } from "./sample-data";
import type { Developer, PaymentPlan, Project, ProjectSummary } from "./types";

// Every page reads data through these functions. They use the demo data in
// ./sample-data.ts for now; swap each body for a Prisma query (src/lib/db.ts)
// once the database has real developers. The signatures stay the same.

export type { Developer, MasterPlanZone, PaymentPlan, Photo, Project, ProjectSummary, Text, Typology } from "./types";

export const isCashPlan = (plan: PaymentPlan) => plan.years === 0;

export function summarize(project: Project): ProjectSummary {
  const prices = project.typologies.map((t) => t.priceFrom);
  const perM2 = project.typologies.map((t) => t.priceFrom / t.buaM2);
  const areas = project.typologies.map((t) => t.buaM2);
  const installments = project.paymentPlans.filter((p) => !isCashPlan(p));
  return {
    startingPrice: Math.min(...prices),
    avgPricePerM2: Math.round(perM2.reduce((a, b) => a + b, 0) / perM2.length / 50) * 50,
    minDownPct: installments.length ? Math.min(...installments.map((p) => p.downPaymentPct)) : 100,
    maxYears: installments.length ? Math.max(...installments.map((p) => p.years)) : 0,
    maxCashDiscountPct: Math.max(0, ...project.paymentPlans.map((p) => p.cashDiscountPct ?? 0)),
    areaRange: [Math.min(...areas), Math.max(...areas)],
    subTypes: [...new Set(project.typologies.map((t) => t.subType))],
    finishings: [...new Set(project.typologies.map((t) => t.finishing))],
  };
}

export async function listDevelopers(): Promise<Developer[]> {
  return developers;
}

export async function getDeveloper(slug: string): Promise<Developer | undefined> {
  return developers.find((d) => d.slug === slug);
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return projects.find((p) => p.slug === slug);
}

export async function listProjectSlugs(): Promise<string[]> {
  return projects.map((p) => p.slug);
}

export async function getFeaturedProjects(): Promise<Project[]> {
  return projects.filter((p) => p.isFeatured);
}

export async function getProjectsByDeveloper(developerSlug: string): Promise<Project[]> {
  return projects.filter((p) => p.developerSlug === developerSlug);
}

export async function getProjectsBySlugs(slugs: string[]): Promise<Project[]> {
  return slugs.map((s) => projects.find((p) => p.slug === s)).filter((p): p is Project => Boolean(p));
}

/** Names only, for the project pickers on the comparison page. */
export async function listProjectOptions(): Promise<{ slug: string; name: Project["name"] }[]> {
  return projects.map(({ slug, name }) => ({ slug, name }));
}

export async function countProjectsByArea(): Promise<Partial<Record<AreaSlug, number>>> {
  const counts: Partial<Record<AreaSlug, number>> = {};
  for (const p of projects) counts[p.areaSlug] = (counts[p.areaSlug] ?? 0) + 1;
  return counts;
}

export async function countProjectsByDeveloper(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const p of projects) counts[p.developerSlug] = (counts[p.developerSlug] ?? 0) + 1;
  return counts;
}

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

export async function searchProjects(filters: ProjectFilters): Promise<Project[]> {
  const q = filters.q?.trim().toLowerCase();
  const devNames = new Map(developers.map((d) => [d.slug, `${d.name.ar} ${d.name.en}`.toLowerCase()]));

  const result = projects.filter((p) => {
    const s = summarize(p);
    if (q && !`${p.name.ar} ${p.name.en} ${devNames.get(p.developerSlug) ?? ""}`.toLowerCase().includes(q)) return false;
    if (filters.category && !p.categories.includes(filters.category)) return false;
    if (filters.areas?.length && !filters.areas.includes(p.areaSlug)) return false;
    if (filters.developer && p.developerSlug !== filters.developer) return false;
    if (filters.statuses?.length && !filters.statuses.includes(p.status)) return false;
    if (filters.deliveryBy && p.deliveryYear > filters.deliveryBy) return false;
    if (filters.maxDownPct && s.minDownPct > filters.maxDownPct) return false;
    if (filters.minYears && s.maxYears < filters.minYears) return false;
    return true;
  });

  const by: Record<Sort, (a: Project, b: Project) => number> = {
    newest: (a, b) => (b.launchYear ?? 0) - (a.launchYear ?? 0),
    price: (a, b) => summarize(a).startingPrice - summarize(b).startingPrice,
    down: (a, b) => summarize(a).minDownPct - summarize(b).minDownPct,
    delivery: (a, b) => a.deliveryYear - b.deliveryYear,
  };
  return result.sort(by[filters.sort ?? "newest"]);
}

export async function totalProjects(): Promise<number> {
  return projects.length;
}
