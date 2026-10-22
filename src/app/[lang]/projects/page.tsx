import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterForm } from "@/components/filter-form";
import { ProjectCard } from "@/components/project-card";
import { Container } from "@/components/ui";
import { listDevelopers, searchProjects, SORTS, totalProjects, type ProjectFilters, type Sort } from "@/lib/catalog";
import { fill } from "@/lib/format";
import { AREA_SLUGS, isAreaSlug, isProjectStatus, isPropertyCategory, PROJECT_STATUSES, PROPERTY_CATEGORIES } from "@/lib/property";
import { getDictionary, getLocale, type Dictionary } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.meta.projectsTitle };
}

type Search = Record<string, string | string[] | undefined>;

export default async function ProjectsPage({ searchParams }: PageProps<"/[lang]/projects">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <Container className="flex flex-col gap-7 pt-10 pb-20">
      <div className="flex flex-col gap-1">
        <nav aria-label="breadcrumb" className="flex gap-1.5 text-[13px] text-muted">
          <Link href={`/${locale}`}>{dict.nav.homeShort}</Link>
          <span aria-hidden="true">/</span>
          <span>{dict.nav.projects}</span>
        </nav>
        <h1 className="font-display text-4xl font-normal tracking-tight sm:text-[38px]">{dict.projectsPage.title}</h1>
      </div>
      <Suspense fallback={<p className="rounded-[20px] border border-line bg-surface p-10 text-muted">{dict.projectsPage.loading}</p>}>
        <Results searchParams={searchParams} locale={locale} dict={dict} />
      </Suspense>
    </Container>
  );
}

const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
const one = (v: string | string[] | undefined) => all(v)[0];
const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function readFilters(params: Search): ProjectFilters {
  const category = one(params.category);
  const sort = one(params.sort);
  return {
    q: one(params.q),
    category: isPropertyCategory(category) ? category : undefined,
    areas: all(params.area).filter(isAreaSlug),
    developer: one(params.developer),
    statuses: all(params.status).filter(isProjectStatus),
    deliveryBy: num(params.delivery),
    maxDownPct: num(params.down),
    minYears: num(params.years),
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "newest",
  };
}

/** Builds a link that changes one filter and keeps the rest. */
function withParam(locale: string, params: Search, key: string, value: string | undefined) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (k !== key) all(v).forEach((x) => next.append(k, x));
  if (value) next.set(key, value);
  const qs = next.toString();
  return `/${locale}/projects${qs ? `?${qs}` : ""}`;
}

const select =
  "min-h-11.5 w-full rounded-xl border border-line-strong bg-surface px-3 text-[15px] font-normal text-ink focus:border-brand focus:outline-none";
const legend = "mb-1.5 p-0 text-sm font-semibold";

async function Results({ searchParams, locale, dict }: { searchParams: Promise<Search>; locale: "ar" | "en"; dict: Dictionary }) {
  const params = await searchParams;
  const f = readFilters(params);
  const [results, developers, total] = await Promise.all([searchProjects(f), listDevelopers(), totalProjects()]);
  const devBySlug = new Map(developers.map((d) => [d.slug, d]));
  const p = dict.projectsPage;

  return (
    <FilterForm action={`/${locale}/projects`} className="flex flex-col gap-6">
      {f.category && <input type="hidden" name="category" value={f.category} />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-muted" aria-live="polite">
          {fill(p.results, { n: results.length })}
          {results.length !== total && <span> / {total}</span>}
        </p>
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex flex-col text-xs font-medium text-muted">
            {p.search}
            <input
              type="search"
              name="q"
              defaultValue={f.q}
              placeholder={p.searchPlaceholder}
              className="min-h-11.5 min-w-60 rounded-xl border border-line-strong bg-surface px-3.5 text-[15px] text-ink focus:border-brand focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-muted">
            {p.sort}
            <select name="sort" defaultValue={f.sort} className={select}>
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {p.sorts[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <nav aria-label={dict.home.type} className="flex flex-wrap gap-2">
        {[undefined, ...PROPERTY_CATEGORIES].map((c) => {
          const active = f.category === c;
          return (
            <Link
              key={c ?? "all"}
              href={withParam(locale, params, "category", c)}
              aria-current={active ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-5 text-[15px] no-underline ${
                active ? "border-brand bg-brand font-medium text-white hover:text-white" : "border-line-strong bg-surface text-ink hover:border-ink hover:text-ink"
              }`}
            >
              {c ? dict.categories[c] : p.allTypes}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-start gap-7">
        <aside aria-label={p.filters} className="flex flex-[1_1_260px] flex-col gap-5.5 rounded-[20px] border border-line bg-surface p-5.5">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-medium">{p.filters}</span>
            <Link href={`/${locale}/projects`} className="inline-flex min-h-11 items-center text-sm">
              {p.clearAll}
            </Link>
          </div>

          <fieldset className="m-0 flex flex-col border-0 p-0">
            <legend className={legend}>{p.area}</legend>
            {AREA_SLUGS.map((slug) => (
              <label key={slug} className="flex min-h-9 items-center gap-2.5 text-[15px]">
                <input type="checkbox" name="area" value={slug} defaultChecked={f.areas?.includes(slug)} className="size-4.5 accent-brand" />
                {dict.areas[slug]}
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {p.developer}
            <select name="developer" defaultValue={f.developer ?? ""} className={select}>
              <option value="">{p.anyDeveloper}</option>
              {developers.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name[locale]}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="m-0 flex flex-col border-0 p-0">
            <legend className={legend}>{p.status}</legend>
            {PROJECT_STATUSES.map((s) => (
              <label key={s} className="flex min-h-9 items-center gap-2.5 text-[15px]">
                <input type="checkbox" name="status" value={s} defaultChecked={f.statuses?.includes(s)} className="size-4.5 accent-brand" />
                {dict.status[s]}
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {p.deliveryBy}
            <select name="delivery" defaultValue={f.deliveryBy ?? ""} className={select}>
              <option value="">{p.anyYear}</option>
              {[2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {p.maxDown}
            <select name="down" defaultValue={f.maxDownPct ?? ""} className={select}>
              <option value="">{p.anyDown}</option>
              {[5, 10, 20].map((n) => (
                <option key={n} value={n}>
                  {fill(p.upToPct, { n })}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {p.minYears}
            <select name="years" defaultValue={f.minYears ?? ""} className={select}>
              <option value="">{p.anyYears}</option>
              {[5, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {fill(p.yearsPlus, { n })}
                </option>
              ))}
            </select>
          </label>

          {/* Filters apply on change; this button is for keyboard users and no-JS visitors. */}
          <button type="submit" className="min-h-11 rounded-xl bg-brand font-medium text-white hover:bg-brand-2">
            {p.apply}
          </button>
        </aside>

        <section aria-label={fill(p.results, { n: results.length })} className="flex min-w-0 flex-[999_1_640px] flex-col gap-5">
          {results.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-line-strong bg-surface p-10 text-center text-body">{p.empty}</p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-5">
              {results.map((project) => (
                <li key={project.slug} className="flex">
                  <div className="w-full">
                    <ProjectCard project={project} developer={devBySlug.get(project.developerSlug)} locale={locale} dict={dict} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </FilterForm>
  );
}
