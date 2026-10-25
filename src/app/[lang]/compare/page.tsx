import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CompareShell, CompareSync, ProjectPicker, RestoreSavedList } from "@/components/compare/compare-client";
import { PrintButton, ShareButton } from "@/components/share-button";
import { Container, Eyebrow } from "@/components/ui";
import { artKindFor, ProjectArt } from "@/components/project-art";
import { getProjectsBySlugs, listDevelopers, listProjectOptions, summarize, type Project } from "@/lib/catalog";
import { MAX_COMPARE, parseCompareParam } from "@/lib/compare";
import { fill, formatMoney, formatNumber, telHref } from "@/lib/format";
import { AMENITIES, type Amenity } from "@/lib/property";
import { getDictionary, getLocale, type Dictionary } from "../dictionaries";

type Locale = "ar" | "en";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.meta.compareTitle };
}

export default async function ComparePage({ searchParams }: PageProps<"/[lang]/compare">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const c = dict.comparePage;

  return (
    <Container className="flex flex-col gap-6 pt-10 pb-24">
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{c.eyebrow}</Eyebrow>
        <h1 className="font-display text-4xl font-normal tracking-tight sm:text-[40px]">{c.title}</h1>
        <p className="text-muted">{c.subtitle}</p>
      </div>
      <Suspense fallback={<p className="rounded-3xl border border-line bg-surface p-10 text-muted">{c.loading}</p>}>
        <CompareBody searchParams={searchParams} locale={locale} dict={dict} />
      </Suspense>
    </Container>
  );
}

type Cell = { text: string; best?: boolean; yes?: boolean };
type Row = { label: string; cells: Cell[]; same: boolean } | { section: string };

async function CompareBody({
  searchParams,
  locale,
  dict,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  locale: Locale;
  dict: Dictionary;
}) {
  const params = await searchParams;
  const slugs = parseCompareParam(params.p);
  const [projects, options, developers] = await Promise.all([getProjectsBySlugs(slugs), listProjectOptions(), listDevelopers()]);
  const c = dict.comparePage;
  const shown = projects.map((p) => p.slug);

  if (projects.length === 0) {
    const empty = (
      <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-line-strong bg-surface p-8 sm:p-10">
        <h2 className="font-display text-2xl font-medium">{c.emptyTitle}</h2>
        <p className="text-body">{c.emptyText}</p>
        <div className="w-full max-w-sm">
          <ProjectPicker locale={locale} slugs={[]} index={0} options={options} label={c.choose} placeholder={c.choose} />
        </div>
        <Link href={`/${locale}/projects`} className="font-semibold">
          {c.browse}
        </Link>
      </div>
    );
    // "?p=" present but empty means the visitor removed the last project: clear the saved list too.
    return params.p !== undefined ? (
      <>
        <CompareSync items={[]} />
        {empty}
      </>
    ) : (
      <RestoreSavedList locale={locale}>{empty}</RestoreSavedList>
    );
  }

  const devName = new Map(developers.map((d) => [d.slug, d]));
  const sums = projects.map(summarize);
  const cols = projects.length + (projects.length < MAX_COMPARE ? 1 : 0);
  const grid = { gridTemplateColumns: `minmax(170px,240px) repeat(${cols}, minmax(200px,1fr))` };
  const removeHref = (slug: string) => `/${locale}/compare?p=${shown.filter((s) => s !== slug).join(",")}`;

  const rows = buildRows(projects, sums, locale, dict, (slug) => devName.get(slug)?.name[locale] ?? "");

  return (
    <CompareShell
      label={c.diffOnly}
      toolbar={
        <>
          <ShareButton
            label={c.share}
            copiedLabel={c.copied}
            title={c.title}
            className="press inline-flex min-h-12 items-center rounded-full border border-line-strong bg-surface px-5 text-[15px] hover:border-ink"
          />
          <PrintButton label={c.print} className="press inline-flex min-h-12 items-center rounded-full bg-brand px-5.5 text-[15px] font-medium text-white hover:bg-brand-2" />
        </>
      }
    >
      <CompareSync items={projects.map((p) => ({ slug: p.slug, name: p.name }))} />
      <div className="overflow-x-auto rounded-3xl border border-line bg-surface print:overflow-visible">
        <div role="table" aria-label={c.title} className="min-w-fit">
          {/* Column heads */}
          <div role="row" className="grid border-b border-line" style={grid}>
            <div role="columnheader" className="flex items-end p-6 text-sm text-muted">
              {c.rowsLabel}
            </div>
            {projects.map((p, i) => (
              <div role="columnheader" key={p.slug} className="flex flex-col gap-3 border-s border-divider p-5">
                <div className="relative h-35 overflow-hidden rounded-2xl">
                  <ProjectArt seed={p.slug} kind={artKindFor(p)} tone="dusk" className="absolute inset-0 size-full" />
                  <Link
                    href={removeHref(p.slug)}
                    scroll={false}
                    aria-label={fill(c.remove, { name: p.name[locale] })}
                    className="absolute top-2 end-2 flex size-11 items-center justify-center rounded-full bg-surface text-lg text-ink no-underline hover:text-ink print:hidden"
                  >
                    ×
                  </Link>
                </div>
                <ProjectPicker locale={locale} slugs={shown} index={i} options={options} label={fill(c.projectN, { n: i + 1 })} />
                <Link href={`/${locale}/projects/${p.slug}`} className="font-display text-lg font-medium text-ink no-underline">
                  {p.name[locale]}
                </Link>
                <span className="text-sm text-muted">
                  {devName.get(p.developerSlug)?.name[locale]} · {dict.areas[p.areaSlug]}
                </span>
              </div>
            ))}
            {projects.length < MAX_COMPARE && (
              <div role="columnheader" className="flex flex-col justify-center gap-3 border-s border-divider bg-ground/60 p-5 print:hidden">
                <span className="font-semibold">{c.addProject}</span>
                <ProjectPicker locale={locale} slugs={shown} index={shown.length} options={options} label={c.choose} placeholder={c.choose} />
              </div>
            )}
          </div>

          {rows.map((row) =>
            "section" in row ? (
              <div role="row" key={row.section} className="border-b border-divider bg-ground px-6 py-3 font-display font-medium">
                <span role="rowheader">{row.section}</span>
              </div>
            ) : (
              <div
                role="row"
                key={row.label}
                className={`grid border-b border-divider ${row.same ? "group-data-[diff=on]/cmp:hidden" : ""}`}
                style={grid}
              >
                <div role="rowheader" className="px-6 py-3.5 text-sm text-body">
                  {row.label}
                </div>
                {row.cells.map((cell, i) => (
                  <div role="cell" key={i} className="flex flex-wrap items-center gap-2 border-s border-divider px-5 py-3.5">
                    {cell.yes && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8fd0c9" strokeWidth="2.2" aria-hidden="true">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                    <span className="font-medium">{cell.text}</span>
                    {cell.best && <span className="rounded-full bg-best px-2.5 py-px text-xs font-semibold text-brass-dark">{c.best}</span>}
                  </div>
                ))}
                {projects.length < MAX_COMPARE && <div role="cell" className="border-s border-divider print:hidden" />}
              </div>
            ),
          )}

          {/* Master plan preview and hotline */}
          <div role="row" className="grid" style={grid}>
            <div role="rowheader" className="px-6 py-5 text-sm text-body">
              {c.sections.contact}
            </div>
            {projects.map((p) => {
              const dev = devName.get(p.developerSlug);
              const hotline = dev?.contacts.hotline;
              const tel = telHref(hotline);
              return (
                <div role="cell" key={p.slug} className="flex flex-col gap-2.5 border-s border-divider p-5">
                  <div className="flex h-30 items-center justify-center rounded-[14px] border border-line bg-plan text-xs text-body">{c.masterPlanPreview}</div>
                  {hotline && (
                    <ContactChip href={tel}>
                      <span>{dict.projectPage.hotline}</span>
                      <span dir="ltr" className="font-semibold text-brass-light">
                        {hotline}
                      </span>
                    </ContactChip>
                  )}
                  <Link
                    href={`/${locale}/projects/${p.slug}#masterplan`}
                    className="inline-flex min-h-11.5 items-center justify-center rounded-xl border border-line-strong text-sm text-ink no-underline hover:border-ink hover:text-ink"
                  >
                    {c.projectPage}
                  </Link>
                </div>
              );
            })}
            {projects.length < MAX_COMPARE && <div role="cell" className="border-s border-divider print:hidden" />}
          </div>
        </div>
      </div>
      <p className="text-[13px] text-muted">{c.note}</p>
    </CompareShell>
  );
}

function ContactChip({ href, children }: { href?: string; children: ReactNode }) {
  const cls = "flex min-h-11.5 items-center justify-between rounded-xl bg-brand px-3.5 text-sm text-white no-underline hover:bg-brand-2 hover:text-white";
  return href ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <div className={cls}>{children}</div>
  );
}

function buildRows(
  projects: Project[],
  sums: ReturnType<typeof summarize>[],
  locale: Locale,
  dict: Dictionary,
  developerName: (slug: string) => string,
): Row[] {
  const r = dict.comparePage.rows;
  const s = dict.comparePage.sections;
  const m2 = locale === "ar" ? "م²" : "m²";

  /** A row of plain values; `better` marks the lowest or highest number as best. */
  function row(label: string, texts: string[], values?: number[], better?: "low" | "high"): Row {
    let best: number | undefined;
    if (values && better && new Set(values).size > 1) best = better === "low" ? Math.min(...values) : Math.max(...values);
    return {
      label,
      same: new Set(texts).size === 1,
      cells: texts.map((text, i) => ({ text, best: best !== undefined && values?.[i] === best })),
    };
  }
  const amenityRow = (a: Amenity): Row => {
    const has = projects.map((p) => p.amenities.includes(a));
    return {
      label: dict.amenities[a],
      same: new Set(has).size === 1,
      cells: has.map((h) => ({ text: h ? dict.comparePage.yes : dict.comparePage.no, yes: h })),
    };
  };
  // Only amenities that at least one compared project has.
  const amenities = AMENITIES.filter((a) => projects.some((p) => p.amenities.includes(a)));

  return [
    { section: s.about },
    row(r.developer, projects.map((p) => developerName(p.developerSlug))),
    row(r.area, projects.map((p) => dict.areas[p.areaSlug])),
    row(r.type, projects.map((p) => p.categories.map((c) => dict.categories[c]).join(" · "))),
    row(r.land, projects.map((p) => (p.landFeddan ? fill(dict.projectPage.feddan, { n: p.landFeddan }) : "—"))),
    row(r.status, projects.map((p) => dict.status[p.status])),
    row(r.delivery, projects.map((p) => String(p.deliveryYear)), projects.map((p) => p.deliveryYear), "low"),
    { section: s.units },
    row(r.unitTypes, sums.map((x) => x.subTypes.map((t) => dict.subTypes[t]).join(" · "))),
    row(r.areaRange, sums.map((x) => `${x.areaRange[0]} – ${x.areaRange[1]} ${m2}`)),
    row(r.finishing, sums.map((x) => x.finishings.map((f) => dict.finishing[f]).join(" · "))),
    { section: s.prices },
    row(r.startingPrice, sums.map((x) => formatMoney(x.startingPrice, locale)), sums.map((x) => x.startingPrice), "low"),
    row(r.pricePerM2, sums.map((x) => formatMoney(x.avgPricePerM2, locale)), sums.map((x) => x.avgPricePerM2), "low"),
    row(r.minDown, sums.map((x) => `${x.minDownPct}%`), sums.map((x) => x.minDownPct), "low"),
    row(r.maxYears, sums.map((x) => fill(dict.common.years, { n: x.maxYears })), sums.map((x) => x.maxYears), "high"),
    row(r.cash, sums.map((x) => (x.maxCashDiscountPct ? `${x.maxCashDiscountPct}%` : "—")), sums.map((x) => x.maxCashDiscountPct), "high"),
    row(r.maintenance, projects.map((p) => (p.fees.maintenancePct !== undefined ? `${formatNumber(p.fees.maintenancePct, locale)}%` : "—"))),
    { section: s.amenities },
    ...amenities.map(amenityRow),
  ];
}
