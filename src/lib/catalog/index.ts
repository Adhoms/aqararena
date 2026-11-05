import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { AreaSlug } from "@/lib/property";
import { filterProjects, sortProjects, withinBudget, type ProjectFilters } from "./filters";
import { computeInsights, type MarketInsights } from "./insights";
import * as sample from "./sample-data";
import type { Developer, Project } from "./types";

// Every page reads data through these functions.
//
// - With DATABASE_URL set they query PostgreSQL (./db-source.ts).
// - Without it they serve the demo data in ./sample-data.ts, so the site still runs
//   (e.g. a preview build with no database).
//
// Results are cached for an hour under the "catalog" tag. After changing data, call
// updateTag("catalog") (the admin actions in src/app/admin/actions.ts do) or wait for the hour to pass.

export type { Developer, MasterPlanZone, PaymentPlan, Photo, Project, ProjectSummary, Text, Typology } from "./types";
export { isCashPlan, monthlyFor, summarize } from "./summary";
export { unitName } from "./unit-name";
export { SORTS, type ProjectFilters, type Sort } from "./filters";
export { bestBudgetFit, budgetFits, hasBudget, type Budget, type BudgetFit } from "./budget";
export type { AreaInsight, MarketInsights, ProjectValue } from "./insights";

export const CATALOG_TAG = "catalog";
const usesDatabase = Boolean(process.env.DATABASE_URL);

// Loaded only when there is a database, so the demo mode never touches Prisma.
const source = () => import("./db-source");

function cached() {
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
}

async function allProjects(): Promise<Project[]> {
  "use cache";
  cached();
  return usesDatabase ? (await source()).dbProjects() : sample.projects;
}

export async function listDevelopers(): Promise<Developer[]> {
  "use cache";
  cached();
  return usesDatabase ? (await source()).dbDevelopers() : sample.developers;
}

export async function getDeveloper(slug: string): Promise<Developer | undefined> {
  "use cache";
  cached();
  return usesDatabase ? (await source()).dbDeveloper(slug) : sample.developers.find((d) => d.slug === slug);
}

export async function getProject(slug: string): Promise<Project | undefined> {
  "use cache";
  cached();
  return usesDatabase ? (await source()).dbProject(slug) : sample.projects.find((p) => p.slug === slug);
}

export async function searchProjects(filters: ProjectFilters): Promise<Project[]> {
  "use cache";
  cached();
  const found = usesDatabase
    ? await (await source()).dbProjects((await source()).filtersToWhere(filters))
    : filterProjects(sample.projects, sample.developers, filters);
  // The budget check needs every unit type × plan, so it runs here for both sources.
  return sortProjects(withinBudget(found, filters), filters.sort);
}

export async function getMarketInsights(): Promise<MarketInsights> {
  return computeInsights(await allProjects());
}

/** Every published project, e.g. for the map. */
export async function listProjects(): Promise<Project[]> {
  return allProjects();
}

export async function getFeaturedProjects(): Promise<Project[]> {
  return (await allProjects()).filter((p) => p.isFeatured);
}

export async function getProjectsByDeveloper(developerSlug: string): Promise<Project[]> {
  return (await allProjects()).filter((p) => p.developerSlug === developerSlug);
}

/** In the order asked for; unknown slugs are skipped. */
export async function getProjectsBySlugs(slugs: string[]): Promise<Project[]> {
  const all = await allProjects();
  return slugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is Project => Boolean(p));
}

export async function listProjectSlugs(): Promise<string[]> {
  return (await allProjects()).map((p) => p.slug);
}

/** Names only, for the project pickers on the comparison page. */
export async function listProjectOptions(): Promise<{ slug: string; name: Project["name"] }[]> {
  return (await allProjects()).map(({ slug, name }) => ({ slug, name }));
}

export async function totalProjects(): Promise<number> {
  return (await allProjects()).length;
}

export async function countProjectsByArea(): Promise<Partial<Record<AreaSlug, number>>> {
  const counts: Partial<Record<AreaSlug, number>> = {};
  for (const p of await allProjects()) counts[p.areaSlug] = (counts[p.areaSlug] ?? 0) + 1;
  return counts;
}

export async function countProjectsByDeveloper(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const p of await allProjects()) counts[p.developerSlug] = (counts[p.developerSlug] ?? 0) + 1;
  return counts;
}
