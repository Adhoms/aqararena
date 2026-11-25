import { Check } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/site";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CompareShell, CompareSync, ProjectPicker, RestoreSavedList } from "@/components/compare/compare-client";
import { PrintButton, ShareButton } from "@/components/share-button";
import { Container, Eyebrow } from "@/components/ui";
import { ProjectCover } from "@/components/project-cover";
import {
  currencyOf,
  getMarketInsights,
  getProjectsBySlugs,
  listDevelopers,
  listProjectOptions,
  summarize,
  type Developer,
  type MarketInsights,
  type Project,
} from "@/lib/catalog";
import { MAX_COMPARE, parseCompareParam } from "@/lib/compare";
import { fill, formatMoney, formatNumber, telHref, whatsappHref } from "@/lib/format";
import { AMENITIES, type Amenity } from "@/lib/property";
import { getDictionary, getLocale, type Dictionary } from "../dictionaries";

type Locale = "ar" | "en";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: dict.meta.compareTitle, alternates: pageAlternates(locale, "/compare") };
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

type Cell = { text: string; best?: boolean; yes?: boolean; href?: string };
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
  const [projects, options, developers, insights] = await Promise.all([
    getProjectsBySlugs(slugs),
    listProjectOptions(),
    listDevelopers(),
    getMarketInsights(),
  ]);
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

  const rows = buildRows(projects, sums, locale, dict, (slug) => devName.get(slug), insights);

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
                  <ProjectCover project={p} className="absolute inset-0 size-full" />
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
                      <Check size={18} weight="bold" className="text-brass" aria-hidden="true" />
                    )}
                    {cell.href ? (
                      <a href={cell.href} target="_blank" rel="noreferrer" className="font-medium">
                        {cell.text}
                      </a>
                    ) : (
                      <span className="font-medium">{cell.text}</span>
                    )}
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
              const sales = dev?.contacts.salesPhone;
              const wa = whatsappHref(dev?.contacts.whatsapp);
              const plan = p.masterPlanUrl;
              return (
                <div role="cell" key={p.slug} className="flex flex-col gap-2.5 border-s border-divider p-5">
                  {plan ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={plan} alt={`${c.masterPlanPreview} · ${p.name[locale]}`} loading="lazy" className="h-30 w-full rounded-2xl border border-line bg-plan object-cover" />
                  ) : (
                    <div className="flex h-30 items-center justify-center rounded-2xl border border-dashed border-line bg-plan px-3 text-center text-xs text-muted">
                      {c.noMasterPlan}
                    </div>
                  )}
                  {hotline && (
                    <ContactChip href={tel}>
                      <span>{dict.projectPage.hotline}</span>
                      <span dir="ltr" className="font-semibold text-brass-light">
                        {hotline}
                      </span>
                    </ContactChip>
                  )}
                  {sales && sales !== hotline && (
                    <ContactChip href={telHref(sales)}>
                      <span>{dict.projectPage.sales}</span>
                      <span dir="ltr" className="font-semibold text-brass-light">
                        {sales}
                      </span>
                    </ContactChip>
                  )}
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11.5 items-center justify-center rounded-xl border border-line-strong text-sm text-ink no-underline hover:border-ink hover:text-ink"
                    >
                      {dict.projectPage.whatsapp}
                    </a>
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
  developerOf: (slug: string) => Developer | undefined,
  insights: MarketInsights,
): Row[] {
  const c = dict.comparePage;
  const r = c.rows;
  const s = c.sections;
  const m2 = locale === "ar" ? "م²" : "m²";
  const NA = "-";
  const num = (n: number) => formatNumber(n, locale);
  // Each column in its project's currency; amounts only get a "best" mark when every column is in the same one.
  const currencies = projects.map(currencyOf);
  const money = (n: number | undefined, i: number) => (n ? formatMoney(n, locale, currencies[i]) : NA);
  const oneCurrency = new Set(currencies).size === 1;
  const amounts = (v: (number | undefined)[]) => (oneCurrency ? v : undefined);
  const pct = (n: number | undefined) => (n !== undefined && n !== null ? `${formatNumber(n, locale)}%` : NA);
  const yesNo = (has: boolean[], label: string): Row => ({
    label,
    same: new Set(has).size === 1,
    cells: has.map((h) => ({ text: h ? c.yes : c.no, yes: h })),
  });

  /** A row of plain values; `better` marks the lowest or highest number as best. */
  function row(label: string, texts: string[], values?: (number | undefined)[], better?: "low" | "high"): Row {
    let best: number | undefined;
    const known = (values ?? []).filter((v): v is number => v !== undefined && Number.isFinite(v));
    if (better && known.length > 1 && new Set(known).size > 1) best = better === "low" ? Math.min(...known) : Math.max(...known);
    return {
      label,
      same: new Set(texts).size === 1,
      cells: texts.map((text, i) => ({ text, best: best !== undefined && values?.[i] === best })),
    };
  }

  const devs = projects.map((p) => developerOf(p.developerSlug));
  const values = projects.map((p) => insights.values[p.slug]);
  const installments = projects.map((p) => p.paymentPlans.filter((pl) => pl.years > 0));

  // Bedrooms: "2-4" from the unit types that state them.
  const bedrooms = projects.map((p) => {
    const beds = p.typologies.map((t) => t.bedrooms).filter((b): b is number => !!b);
    if (!beds.length) return NA;
    const lo = Math.min(...beds);
    const hi = Math.max(...beds);
    return lo === hi ? num(lo) : `${num(lo)}-${num(hi)}`;
  });
  const maxPrice = projects.map((p) => Math.max(...p.typologies.map((t) => t.priceFrom)));
  const minDelivery = installments.map((list) => (list.length ? Math.min(...list.map((pl) => pl.deliveryPaymentPct)) : undefined));
  const frequencies = installments.map((list) => [...new Set(list.map((pl) => pl.frequency))].map((f) => dict.frequency[f]).join(" · ") || NA);
  const dateLocale = locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
  const launch = projects.map((p) =>
    p.launchDate
      ? new Intl.DateTimeFormat(dateLocale, { month: "long", year: "numeric" }).format(new Date(p.launchDate))
      : p.launchYear
        ? String(p.launchYear)
        : NA,
  );
  const updated = projects.map((p) =>
    p.pricesUpdated ? new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(p.pricesUpdated)) : NA,
  );
  const vsArea = values.map((v) => (v ? (v.vsAreaPct === 0 ? dict.insights.average : fill(v.vsAreaPct < 0 ? dict.insights.cheaper : dict.insights.pricier, { n: Math.abs(v.vsAreaPct) })) : NA));

  // Travel times: every place any compared project lists, by name.
  const places = new Map<string, (number | undefined)[]>();
  projects.forEach((p, i) => {
    for (const d of p.distances) {
      const key = d.place[locale];
      if (!places.has(key)) places.set(key, projects.map(() => undefined));
      places.get(key)![i] = d.minutes;
    }
  });
  const distanceRows = [...places.entries()]
    .sort((a, b) => b[1].filter((m) => m !== undefined).length - a[1].filter((m) => m !== undefined).length)
    .map(([place, mins]) => row(place, mins.map((m) => (m !== undefined ? fill(dict.projectPage.minutes, { n: m }) : NA)), mins, "low"));

  const amenityRow = (a: Amenity): Row => yesNo(projects.map((p) => p.amenities.includes(a)), dict.amenities[a]);
  // Only amenities that at least one compared project has.
  const amenities = AMENITIES.filter((a) => projects.some((p) => p.amenities.includes(a)));

  const all: Row[] = [
    { section: s.value },
    row(r.valueScore, values.map((v) => (v ? `${formatNumber(v.score, locale)} / 10` : NA)), values.map((v) => v?.score), "high"),
    row(r.vsArea, vsArea, values.map((v) => v?.vsAreaPct), "low"),
    row(r.areaRank, values.map((v, i) => (v ? fill(dict.insights.rank, { rank: v.areaRank, count: v.areaCount, area: dict.areas[projects[i].areaSlug] }) : NA))),

    { section: s.about },
    row(r.developer, devs.map((d) => d?.name[locale] ?? NA)),
    row(r.developerFounded, devs.map((d) => (d?.foundedYear ? String(d.foundedYear) : NA)), devs.map((d) => d?.foundedYear), "low"),
    yesNo(devs.map((d) => !!d?.verified), r.developerVerified),
    row(r.area, projects.map((p) => dict.areas[p.areaSlug])),
    row(r.district, projects.map((p) => p.district[locale] || NA)),
    row(r.type, projects.map((p) => p.categories.map((x) => dict.categories[x]).join(" · "))),
    row(r.status, projects.map((p) => dict.status[p.status])),
    row(r.launch, launch),
    row(r.delivery, projects.map((p) => String(p.deliveryYear)), projects.map((p) => p.deliveryYear), "low"),
    row(r.progress, projects.map((p) => pct(p.progressPct)), projects.map((p) => p.progressPct), "high"),
    row(r.land, projects.map((p) => (p.landFeddan ? fill(dict.projectPage.feddan, { n: num(p.landFeddan) }) : NA)), projects.map((p) => p.landFeddan), "high"),
    row(r.green, projects.map((p) => pct(p.greenPct)), projects.map((p) => p.greenPct), "high"),
    row(r.unitsCount, projects.map((p) => (p.unitsCount ? fill(dict.projectPage.unitsN, { n: num(p.unitsCount) }) : NA))),

    { section: s.units },
    row(r.unitTypes, sums.map((x) => x.subTypes.map((t) => dict.subTypes[t]).join(" · "))),
    row(r.models, projects.map((p) => num(p.typologies.length)), projects.map((p) => p.typologies.length), "high"),
    row(r.areaRange, sums.map((x) => (x.areaRange[0] === x.areaRange[1] ? `${num(x.areaRange[0])} ${m2}` : `${num(x.areaRange[0])}-${num(x.areaRange[1])} ${m2}`))),
    row(r.bedrooms, bedrooms),
    yesNo(projects.map((p) => p.typologies.some((t) => !!t.gardenM2)), r.withGarden),
    yesNo(projects.map((p) => p.typologies.some((t) => !!t.roofM2)), r.withRoof),
    row(r.finishing, sums.map((x) => x.finishings.map((f) => dict.finishing[f]).join(" · "))),

    { section: s.prices },
    row(r.startingPrice, sums.map((x, i) => money(x.startingPrice, i)), amounts(sums.map((x) => x.startingPrice)), "low"),
    row(r.maxPrice, maxPrice.map((v, i) => money(v, i))),
    row(r.pricePerM2, sums.map((x, i) => money(x.avgPricePerM2, i)), amounts(sums.map((x) => x.avgPricePerM2)), "low"),
    row(r.bookingFee, projects.map((p, i) => money(p.bookingFee, i)), amounts(projects.map((p) => p.bookingFee)), "low"),
    row(r.pricesUpdated, updated),

    { section: s.plans },
    row(r.plansCount, projects.map((p) => num(p.paymentPlans.length)), projects.map((p) => p.paymentPlans.length), "high"),
    row(r.minDown, sums.map((x, i) => (installments[i].length ? `${x.minDownPct}%` : NA)), sums.map((x, i) => (installments[i].length ? x.minDownPct : undefined)), "low"),
    row(r.downAmount, sums.map((x, i) => money(x.entryDown, i)), amounts(sums.map((x) => x.entryDown || undefined)), "low"),
    row(r.monthly, sums.map((x, i) => money(x.minMonthly, i)), amounts(sums.map((x) => x.minMonthly || undefined)), "low"),
    row(r.maxYears, sums.map((x) => (x.maxYears ? fill(dict.common.years, { n: x.maxYears }) : NA)), sums.map((x) => x.maxYears || undefined), "high"),
    row(r.deliveryPayment, minDelivery.map((v) => pct(v)), minDelivery, "low"),
    row(r.frequency, frequencies),
    row(r.cash, sums.map((x) => (x.maxCashDiscountPct ? `${x.maxCashDiscountPct}%` : NA)), sums.map((x) => x.maxCashDiscountPct || undefined), "high"),

    { section: s.fees },
    row(r.maintenance, projects.map((p) => pct(p.fees.maintenancePct)), projects.map((p) => p.fees.maintenancePct), "low"),
    row(r.garage, projects.map((p, i) => money(p.fees.garageFee, i)), amounts(projects.map((p) => p.fees.garageFee)), "low"),
    row(r.club, projects.map((p, i) => money(p.fees.clubFee, i)), amounts(projects.map((p) => p.fees.clubFee)), "low"),

    { section: s.location },
    ...distanceRows,

    { section: s.amenities },
    row(r.amenitiesCount, projects.map((p) => (p.amenities.length ? num(p.amenities.length) : NA)), projects.map((p) => p.amenities.length || undefined), "high"),
    ...amenities.map(amenityRow),

    { section: s.media },
    row(r.photos, projects.map((p) => (p.photos.some((ph) => ph.url) ? num(p.photos.filter((ph) => ph.url).length) : NA)), projects.map((p) => p.photos.filter((ph) => ph.url).length || undefined), "high"),
    yesNo(projects.map((p) => !!p.masterPlanUrl || p.zones.length > 0), r.masterPlan),
    row(r.floorPlans, projects.map((p) => (p.floorPlans?.length ? num(p.floorPlans.length) : NA)), projects.map((p) => p.floorPlans?.length || undefined), "high"),
    {
      label: r.brochure,
      same: new Set(projects.map((p) => !!p.brochureUrl)).size === 1,
      cells: projects.map((p) => (p.brochureUrl ? { text: dict.projectPage.brochure, href: p.brochureUrl, yes: true } : { text: NA })),
    },
  ];

  // Drop rows no compared project has data for, then sections left empty.
  const filled = all.filter((x) => "section" in x || x.cells.some((cell) => cell.text !== NA));
  return filled.filter((x, i) => !("section" in x) || (filled[i + 1] !== undefined && !("section" in filled[i + 1])));
}
