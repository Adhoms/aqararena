import type { Metadata } from "next";
import { pageAlternates } from "@/lib/site";
import Link from "next/link";
import { Suspense } from "react";
import { FilterForm } from "@/components/filter-form";
import { ProjectCard } from "@/components/project-card";
import { Container, CardGridSkeleton } from "@/components/ui";
import { bestBudgetFit, getMarketInsights, hasBudget, listDevelopers, searchProjects, SORTS, totalProjects } from "@/lib/catalog";
import { readFilters } from "@/lib/catalog/read-filters";
import { smartLabels } from "@/components/smart-labels";
import { SmartSearch } from "@/components/smart-search";
import { fill, formatMoney } from "@/lib/format";
import { AREA_SLUGS, FINISH_GROUP_KEYS, PROJECT_STATUSES, PROPERTY_CATEGORIES } from "@/lib/property";
import { getDictionary, getLocale, type Dictionary } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: dict.meta.projectsTitle, alternates: pageAlternates(locale, "/projects") };
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
      <Suspense fallback={<CardGridSkeleton label={dict.projectsPage.loading} />}>
        <Results searchParams={searchParams} locale={locale} dict={dict} />
      </Suspense>
    </Container>
  );
}

const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
const one = (v: string | string[] | undefined) => all(v)[0];
/** Builds a link that removes one value of a repeated parameter (e.g. one unit type). */
function withoutValue(locale: string, params: Search, key: string, value: string) {
  const next = new URLSearchParams();
  // Changing the filters starts again from page 1.
  for (const [k, v] of Object.entries(params)) all(v).forEach((x) => (k === key && x === value) || k === "s" || k === "page" ? null : next.append(k, x));
  const qs = next.toString();
  return `/${locale}/projects${qs ? `?${qs}` : ""}`;
}

/** Builds a link that changes one filter and keeps the rest. */
function withParam(locale: string, params: Search, key: string, value: string | undefined) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (k !== key && k !== "s" && (k !== "page" || key === "page")) all(v).forEach((x) => next.append(k, x));
  if (value) next.set(key, value);
  const qs = next.toString();
  return `/${locale}/projects${qs ? `?${qs}` : ""}`;
}

/** Projects per page: the list stays light however many projects there are. */
const PAGE_SIZE = 24;

const select =
  "min-h-11.5 w-full rounded-xl border border-line-strong bg-surface px-3 text-[15px] font-normal text-ink focus:border-brand focus:outline-none";
const legend = "mb-1.5 p-0 text-sm font-semibold";
/** Price choices in the sidebar, in EGP. */
const PRICE_STEPS = [2, 3, 5, 8, 12, 20, 30, 50].map((m) => m * 1_000_000);

async function Results({ searchParams, locale, dict }: { searchParams: Promise<Search>; locale: "ar" | "en"; dict: Dictionary }) {
  const params = await searchParams;
  const f = readFilters(params);
  const sentence = one(params.s) ?? "";
  const [results, developers, total, insights] = await Promise.all([searchProjects(f), listDevelopers(), totalProjects(), getMarketInsights()]);
  const devBySlug = new Map(developers.map((d) => [d.slug, d]));
  const p = dict.projectsPage;

  // Conditions that come from the smart search (not in the sidebar), shown as removable chips.
  const smartChips = [
    ...(f.subTypes ?? []).map((t) => ({ label: dict.subTypes[t], href: withoutValue(locale, params, "type", t) })),
    ...(f.minBedrooms ? [{ label: fill(dict.smart.chips.minBedrooms, { n: f.minBedrooms }), href: withParam(locale, params, "beds", undefined) }] : []),
    ...(f.q ? [{ label: fill(dict.smart.chips.q, { q: f.q }), href: withParam(locale, params, "q", undefined) }] : []),
    ...(f.cash ? [{ label: fill(dict.budget.chipCash, { amount: formatMoney(f.cash, locale, "EGP") }), href: withParam(locale, params, "cash", undefined) }] : []),
    ...(f.monthly
      ? [{ label: fill(dict.budget.chipMonthly, { amount: formatMoney(f.monthly, locale, "EGP") }), href: withParam(locale, params, "monthly", undefined) }]
      : []),
  ];
  const budgetOn = hasBudget(f);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(one(params.page)) || 1));
  const shown = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <SmartSearch key={sentence} locale={locale} labels={smartLabels(dict)} variant="page" initialText={sentence} />

    <FilterForm action={`/${locale}/projects`} className="flex flex-col gap-6">
      {f.category && <input type="hidden" name="category" value={f.category} />}
      {/* Keep the smart-search conditions when the sidebar filters change. */}
      {f.q && <input type="hidden" name="q" value={f.q} />}
      {f.subTypes?.map((t) => <input key={t} type="hidden" name="type" value={t} />)}
      {f.minBedrooms && <input type="hidden" name="beds" value={f.minBedrooms} />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="me-2 font-semibold" aria-live="polite">
            {fill(p.results, { n: results.length })}
            {results.length !== total && <span className="font-normal text-muted"> / {total}</span>}
          </p>
          {smartChips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              aria-label={fill(dict.smart.remove, { label: chip.label })}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-brass-soft px-3 text-[13px] font-medium text-brass-dark no-underline hover:bg-best hover:text-brass-dark"
            >
              {chip.label} <span aria-hidden="true">×</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
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
        <aside aria-label={p.filters} className="flex flex-[1_1_260px] flex-col gap-5.5 rounded-3xl border border-line bg-surface p-5.5">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-medium">{p.filters}</span>
            <Link href={`/${locale}/projects`} className="inline-flex min-h-11 items-center text-sm">
              {p.clearAll}
            </Link>
          </div>

          {/* Budget first: what the visitor has and can pay, not a unit price. */}
          <fieldset className="m-0 flex flex-col gap-2.5 rounded-2xl border-0 bg-brass-soft p-4">
            <legend className="float-start mb-1 p-0 font-display text-base font-medium">{dict.budget.filterTitle}</legend>
            <label className="clear-both flex flex-col gap-1 text-xs font-medium text-body">
              {dict.budget.cash}
              <input
                type="number"
                name="cash"
                min={0}
                step={50000}
                inputMode="numeric"
                defaultValue={f.cash ?? ""}
                placeholder={dict.budget.cashPlaceholder}
                className={select}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-body">
              {dict.budget.monthly}
              <input
                type="number"
                name="monthly"
                min={0}
                step={1000}
                inputMode="numeric"
                defaultValue={f.monthly ?? ""}
                placeholder={dict.budget.monthlyPlaceholder}
                className={select}
              />
            </label>
            <span className="text-xs text-muted">{dict.budget.filterHint}</span>
          </fieldset>

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

          <fieldset className="m-0 flex flex-col border-0 p-0">
            <legend className={legend}>{p.price}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["min", "max"] as const).map((key) => {
                const current = key === "min" ? f.minPrice : f.maxPrice;
                const steps = [...new Set([...PRICE_STEPS, ...(current ? [current] : [])])].sort((a, b) => a - b);
                return (
                  <label key={key} className="flex flex-col gap-1 text-xs font-medium text-muted">
                    {key === "min" ? p.priceFrom : p.priceTo}
                    <select name={key} defaultValue={current ?? ""} className={select}>
                      <option value="">{p.anyPrice}</option>
                      {steps.map((n) => (
                        <option key={n} value={n}>
                          {fill(p.millions, { n: Math.round((n / 1e6) * 100) / 100 })}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="m-0 flex flex-col border-0 p-0">
            <legend className={legend}>{p.finishing}</legend>
            {FINISH_GROUP_KEYS.map((g) => (
              <label key={g} className="flex min-h-9 items-center gap-2.5 text-[15px]">
                <input type="checkbox" name="finish" value={g} defaultChecked={f.finishes?.includes(g)} className="size-4.5 accent-brand" />
                {dict.finishGroups[g]}
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
            <p className="rounded-3xl border border-dashed border-line-strong bg-surface p-10 text-center text-body">
              {budgetOn ? dict.budget.emptyBudget : p.empty}
            </p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-5">
              {shown.map((project) => (
                <li key={project.slug} className="flex">
                  <div className="w-full">
                    <ProjectCard
                      project={project}
                      developer={devBySlug.get(project.developerSlug)}
                      value={insights.values[project.slug]}
                      fit={budgetOn ? bestBudgetFit(project, f) : undefined}
                      locale={locale}
                      dict={dict}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <nav aria-label={p.pagesLabel} className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={withParam(locale, params, "page", n === 1 ? undefined : String(n))}
                  aria-current={n === page ? "page" : undefined}
                  className={`flex size-11 items-center justify-center rounded-full border text-[15px] no-underline ${
                    n === page ? "border-brand bg-brand font-semibold text-white hover:text-white" : "border-line-strong text-ink hover:border-ink hover:text-ink"
                  }`}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
          {budgetOn && <p className="text-xs text-muted">{dict.budget.note}</p>}
        </section>
      </div>
    </FilterForm>
    </div>
  );
}
