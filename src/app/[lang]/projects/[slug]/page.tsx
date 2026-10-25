import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CompareButton } from "@/components/compare/compare-button";
import { ContactGrid, ContactStack } from "@/components/contact-list";
import { MasterPlan } from "@/components/project/master-plan";
import { ShareButton } from "@/components/share-button";
import { Tabs, type Tab } from "@/components/tabs";
import { ProjectVsMarket, ValueRing, valueText } from "@/components/insights";
import { artKindFor, ProjectArt } from "@/components/project-art";
import { Container, Eyebrow } from "@/components/ui";
import {
  getDeveloper,
  getMarketInsights,
  getProject,
  isCashPlan,
  listProjectSlugs,
  searchProjects,
  summarize,
  type MasterPlanZone,
  type PaymentPlan,
  type Project,
  type Typology,
} from "@/lib/catalog";
import { compareHref } from "@/lib/compare";
import { fill, formatMillions, formatMoney, formatNumber } from "@/lib/format";
import { INSTALLMENTS_PER_YEAR, PHOTO_GROUPS, type SubType } from "@/lib/property";
import { getDictionary, getLocale, type Dictionary } from "../../dictionaries";

type Locale = "ar" | "en";

export async function generateStaticParams() {
  return (await listProjectSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/projects/[slug]">): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const project = await getProject(slug);
  if (!project) return {};
  return { title: project.name[locale], description: project.description[locale] };
}

// Unit-type tabs, in the order they appear on the page.
const UNIT_TAB_GROUPS: { id: keyof Dictionary["unitTabs"]; subTypes: SubType[] }[] = [
  { id: "APARTMENTS", subTypes: ["APARTMENT", "STUDIO", "SERVICED_APARTMENT"] },
  { id: "DUPLEX", subTypes: ["DUPLEX", "PENTHOUSE"] },
  { id: "COASTAL", subTypes: ["CHALET", "CABIN"] },
  { id: "HOUSES", subTypes: ["TOWNHOUSE", "TWIN_HOUSE"] },
  { id: "VILLAS", subTypes: ["VILLA", "MANSION"] },
  { id: "BUSINESS", subTypes: ["OFFICE", "CLINIC"] },
  { id: "RETAIL", subTypes: ["RETAIL", "FOOD_AND_BEVERAGE", "PHARMACY", "BANK"] },
];

const h2 = "font-display text-3xl font-normal tracking-tight";

// The slug comes from the URL, so the content streams in behind a skeleton and navigation stays instant.
export default function Page({ params }: PageProps<"/[lang]/projects/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectContent params={params} />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <Container className="flex animate-pulse flex-col gap-6 pt-10 pb-24">
      <div className="h-4 w-56 rounded bg-divider" />
      <div className="h-12 w-80 rounded-xl bg-divider" />
      <div className="h-96 rounded-3xl bg-photo" />
    </Container>
  );
}

async function ProjectContent({ params }: { params: PageProps<"/[lang]/projects/[slug]">["params"] }) {
  const { slug } = await params;
  const [locale, dict, project] = await Promise.all([getLocale(), getDictionary(), getProject(slug)]);
  if (!project) notFound();
  const developer = await getDeveloper(project.developerSlug);
  if (!developer) notFound();

  const s = summarize(project);
  const p = dict.projectPage;
  const [related, insights] = await Promise.all([searchProjects({ category: project.categories[0] }), getMarketInsights()]);
  const similar = related.filter((x) => x.slug !== project.slug).slice(0, 3);

  const sections = [
    ["overview", p.sections.overview],
    ["market", dict.insights.vsMarket],
    ["masterplan", p.sections.masterplan],
    ["units", p.sections.units],
    ["prices", p.sections.prices],
    ["photos", p.sections.photos],
    ["location", p.sections.location],
    ["contact", p.sections.contact],
  ] as const;

  const facts = [
    project.landFeddan && [p.facts.land, fill(p.feddan, { n: project.landFeddan })],
    project.greenPct && [p.facts.green, `${project.greenPct}%`],
    project.unitsCount && [p.facts.units, formatNumber(project.unitsCount, locale)],
    project.launchYear && [p.facts.launch, String(project.launchYear)],
    [p.facts.delivery, String(project.deliveryYear)],
    project.progressPct !== undefined && [p.facts.progress, `${project.progressPct}%`],
  ].filter((f): f is [string, string] => Array.isArray(f));

  const kind = artKindFor(project);
  const value = insights.values[project.slug];
  const areaAvg = insights.areas.find((a) => a.area === project.areaSlug)?.avgPricePerM2;
  const heroStats: [string, string][] = [
    [dict.common.startingFrom, formatMillions(s.startingPrice, locale)],
    [dict.common.lowestDown, `${s.minDownPct}%`],
    [p.planYears, s.maxYears ? fill(dict.common.years, { n: s.maxYears }) : "—"],
    [dict.common.delivery, String(project.deliveryYear)],
  ];

  return (
    <>
      {/* ─── Hero: the project's scene, full width, with the key numbers on top ─── */}
      <section className="relative isolate overflow-hidden bg-deep text-white">
        <ProjectArt seed={project.slug} kind={kind} tone={kind === "coastal" ? "day" : "dusk"} className="absolute inset-0 -z-10 size-full" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-deep via-deep/55 to-deep/20" />
        <Container className="flex min-h-[78vh] flex-col justify-between gap-10 pt-7 pb-10">
          <nav aria-label="breadcrumb" className="flex flex-wrap gap-1.5 text-[13px] text-on-dark">
            <Link href={`/${locale}`} className="text-on-dark hover:text-white">
              {dict.nav.homeShort}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${locale}/projects`} className="text-on-dark hover:text-white">
              {dict.nav.projects}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${locale}/projects?area=${project.areaSlug}`} className="text-on-dark hover:text-white">
              {dict.areas[project.areaSlug]}
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{project.name[locale]}</span>
          </nav>

          <div className="rise flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-medium backdrop-blur">{dict.status[project.status]}</span>
              {project.categories.slice(0, 3).map((c) => (
                <span key={c} className="rounded-full border border-white/25 px-3 py-0.5 text-xs font-medium">
                  {dict.categories[c]}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-5xl leading-tight font-light tracking-tight sm:text-7xl">{project.name[locale]}</h1>
                <span className="text-lg text-on-dark">
                  {p.by}{" "}
                  <Link href={`/${locale}/developers/${developer.slug}`} className="font-semibold text-brass-light hover:text-white">
                    {developer.name[locale]}
                  </Link>{" "}
                  · {project.district[locale]}
                  {locale === "ar" ? "، " : ", "}
                  {dict.areas[project.areaSlug]}
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5 print:hidden">
                <ShareButton
                  label={p.share}
                  copiedLabel={p.copied}
                  title={project.name[locale]}
                  className="inline-flex min-h-12 items-center rounded-full border border-white/30 bg-white/10 px-5 text-[15px] text-white backdrop-blur hover:bg-white/20"
                />
                <CompareButton
                  slug={project.slug}
                  name={project.name}
                  labels={{ add: dict.common.addToCompare, added: dict.common.inCompare }}
                  className="press min-h-12 rounded-full border-0 bg-brass-light! px-5.5 text-brand! hover:bg-[#d8bc86]!"
                />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-white/15 bg-white/10 backdrop-blur-md sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
              {heroStats.map(([label, v]) => (
                <div key={label} className="flex flex-col-reverse bg-deep/40 px-5 py-4">
                  <dt className="text-[13px] text-on-dark-muted">{label}</dt>
                  <dd className="font-display text-2xl font-light">{v}</dd>
                </div>
              ))}
              {value && (
                <div className="col-span-2 flex items-center gap-3 bg-deep/40 px-5 py-4 sm:col-span-1">
                  <ValueRing score={value.score} label={dict.insights.score} size={52} onDark />
                  <span className="flex flex-col text-[13px] leading-snug">
                    <span className="text-on-dark-muted">{dict.insights.score}</span>
                    <a href="#market" className="text-white hover:text-brass-light">
                      {valueText(value, dict)}
                    </a>
                  </span>
                </div>
              )}
            </dl>
          </div>
        </Container>
      </section>

      {/* ─── Sections bar, stays at the top while scrolling ─── */}
      <nav aria-label={p.sections.overview} className="sticky top-0 z-20 border-b border-line bg-ground/90 backdrop-blur-md print:hidden">
        <Container className="flex gap-x-6.5 overflow-x-auto text-[15px] whitespace-nowrap">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="py-3.5 text-body no-underline hover:text-ink">
              {label}
            </a>
          ))}
        </Container>
      </nav>

      <Container className="flex flex-col gap-18 pt-9 pb-24">
        {/* Overview */}
        <section id="overview" aria-labelledby="overview-title" className="flex flex-wrap items-start gap-9">
          <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5.5">
            <h2 id="overview-title" className={h2}>
              {p.sections.overview}
            </h2>
            <p className="max-w-3xl text-[17px] text-body">{project.description[locale]}</p>
            <dl className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-px overflow-hidden rounded-[18px] border border-line bg-line">
              {facts.map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse gap-0.5 bg-surface p-4.5">
                  <dt className="text-[13px] text-muted">{label}</dt>
                  <dd className="font-display text-xl font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-2.5">
              <h3 className="font-semibold">{p.amenitiesTitle}</h3>
              <ul className="flex flex-wrap gap-2">
                {project.amenities.map((a) => (
                  <li key={a} className="press rounded-full border border-line bg-surface px-4 py-1.5 text-sm">
                    {dict.amenities[a]}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside aria-label={p.officialNumbers} className="flex flex-[1_1_320px] flex-col gap-4.5 rounded-[22px] border border-line bg-surface p-6">
            <div className="flex flex-col">
              <span className="text-[13px] text-muted">{p.pricesFrom}</span>
              <span className="font-display text-[32px] font-medium">{formatMoney(s.startingPrice, locale)}</span>
              <span className="text-sm text-muted">{fill(p.priceSummary, { down: s.minDownPct, years: s.maxYears })}</span>
            </div>
            <div className="flex flex-col gap-2.5 border-t border-divider pt-4">
              <span className="font-semibold">{p.officialNumbers}</span>
              <ContactStack developer={developer} dict={dict} locale={locale} limit={4} />
            </div>
            <p className="text-xs text-muted">{p.neutralNote}</p>
          </aside>
        </section>

        {/* Against the market */}
        {value && areaAvg && (
          <section id="market" aria-labelledby="market-title" className="reveal grid gap-8 rounded-[28px] border border-line bg-surface p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr]">
            <div className="flex flex-col gap-2">
              <Eyebrow>{dict.insights.eyebrow}</Eyebrow>
              <h2 id="market-title" className={h2}>
                {dict.insights.vsMarket}
              </h2>
              <p className="text-sm text-muted">{dict.insights.note}</p>
            </div>
            <ProjectVsMarket avgPricePerM2={s.avgPricePerM2} areaAvg={areaAvg} value={value} area={project.areaSlug} dict={dict} locale={locale} />
          </section>
        )}

        {/* Master plan, on a dark stage */}
        <section id="masterplan" aria-labelledby="masterplan-title" className="reveal flex flex-col gap-6 rounded-[32px] bg-deep p-5 text-white sm:p-10">
          <div className="flex flex-col gap-1">
            <Eyebrow onDark>{p.masterplanEyebrow}</Eyebrow>
            <h2 id="masterplan-title" className={`${h2} sm:text-4xl`}>
              {p.sections.masterplan}
            </h2>
          </div>
          <MasterPlan
            zones={project.zones.map((z) => ({ id: z.id, kind: z.kind, label: z.short[locale], shape: z.shape }))}
            panels={Object.fromEntries(project.zones.map((z) => [z.id, <ZonePanel key={z.id} zone={z} locale={locale} dict={dict} />]))}
            labels={{ zoomIn: p.zoomIn, zoomOut: p.zoomOut, note: p.planNote, plan: p.sections.masterplan }}
          />
        </section>

        {/* Unit types */}
        <section id="units" aria-labelledby="units-title">
          <Tabs
            label={p.sections.units}
            header={
              <h2 id="units-title" className={h2}>
                {p.sections.units}
              </h2>
            }
            tabs={UNIT_TAB_GROUPS.flatMap(({ id, subTypes }): Tab[] => {
              const items = project.typologies.filter((t) => subTypes.includes(t.subType));
              if (!items.length) return [];
              return [
                {
                  id,
                  label: dict.unitTabs[id],
                  content: (
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-5">
                      {items.map((t) => (
                        <li key={t.code}>
                          <UnitCard typology={t} locale={locale} dict={dict} />
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ];
            })}
          />
        </section>

        {/* Price plans */}
        <section id="prices" aria-labelledby="prices-title" className="flex flex-col gap-5.5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="prices-title" className={h2}>
              {p.pricesTitle}
            </h2>
            {project.pricesUpdated && (
              <span className="text-[13px] text-muted">
                {fill(p.pricesUpdated, {
                  date: new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { dateStyle: "long" }).format(
                    new Date(project.pricesUpdated),
                  ),
                })}
              </span>
            )}
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
            {project.paymentPlans.map((plan, i) => (
              <li key={i}>
                <PlanCard plan={plan} price={s.startingPrice} locale={locale} dict={dict} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-x-8 gap-y-2.5 rounded-[18px] border border-line bg-surface px-5.5 py-4.5 text-sm">
            <span className="font-semibold">{p.fees}</span>
            {project.fees.maintenancePct !== undefined && (
              <span>
                {p.maintenance} <b>{project.fees.maintenancePct}%</b>
              </span>
            )}
            <span className="text-muted">{p.pricesNote}</span>
          </div>
        </section>

        {/* Photos */}
        <section id="photos" aria-labelledby="photos-title">
          <Tabs
            label={p.photosTitle}
            header={
              <h2 id="photos-title" className={h2}>
                {p.photosTitle}
              </h2>
            }
            tabs={(["ALL", ...PHOTO_GROUPS] as const).flatMap((group): Tab[] => {
              const items = project.photos.filter((ph) => group === "ALL" || ph.group === group);
              if (!items.length) return [];
              return [
                {
                  id: group,
                  label: dict.photoGroups[group],
                  content: (
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
                      {items.map((ph, i) => (
                        <li key={i} className="group relative h-56 overflow-hidden rounded-[18px]">
                          <ProjectArt
                            seed={`${project.slug}-${ph.caption.en}`}
                            kind={ph.group === "CONSTRUCTION" ? "towers" : kind}
                            tone={ph.group === "INTERIOR" ? "day" : ph.group === "CONSTRUCTION" ? "day" : i % 2 ? "night" : "dusk"}
                            label={ph.caption[locale]}
                            className="absolute inset-0 size-full transition-transform duration-700 group-hover:scale-105"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-4 pt-8 pb-3 text-[13px] text-white">
                            {ph.caption[locale]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ];
            })}
          />
        </section>

        {/* Location */}
        <section id="location" aria-labelledby="location-title" className="flex flex-wrap gap-6">
          <div
            role="img"
            aria-label={p.map}
            className="relative flex h-90 min-w-0 flex-[3_1_520px] items-center justify-center rounded-3xl border border-line bg-plan text-sm text-body"
          >
            <span aria-hidden="true">{p.map}</span>
            <span aria-hidden="true" className="absolute top-[46%] start-[48%] size-4.5 rounded-full border-4 border-brass-light bg-brand" />
          </div>
          <div className="flex flex-[2_1_320px] flex-col gap-3.5">
            <h2 id="location-title" className={h2}>
              {p.locationTitle}
            </h2>
            <span className="text-body">
              {project.district[locale]}{locale === "ar" ? "، " : ", "}{dict.areas[project.areaSlug]}
            </span>
            <dl className="flex flex-col">
              {project.distances.map((d) => (
                <div key={d.place.en} className="flex justify-between border-b border-line py-3">
                  <dt>{d.place[locale]}</dt>
                  <dd className="font-semibold">{fill(p.minutes, { n: d.minutes })}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Developer contacts */}
        <section id="contact" aria-labelledby="contact-title" className="flex flex-wrap items-center gap-9 rounded-[28px] bg-brand p-8 text-white sm:p-11">
          <div className="flex flex-[1_1_320px] flex-col gap-3.5">
            <span aria-hidden="true" className="flex h-16 w-24 items-center justify-center rounded-xl bg-brand-2 text-xs text-on-dark-muted">
              {dict.common.logo}
            </span>
            <h2 id="contact-title" className="font-display text-3xl font-normal">
              {fill(p.contactTitle, { dev: developer.name[locale] })}
            </h2>
            <p className="text-on-dark">{p.contactNote}</p>
            <Link href={`/${locale}/developers/${developer.slug}`} className="font-medium text-brass-light hover:text-white">
              {p.allDevProjects} {locale === "ar" ? "←" : "→"}
            </Link>
          </div>
          <ContactGrid developer={developer} dict={dict} locale={locale} />
        </section>

        {/* Similar projects */}
        {similar.length > 0 && (
          <section aria-labelledby="similar-title" className="flex flex-col gap-5.5 print:hidden">
            <h2 id="similar-title" className={h2}>
              {p.similarTitle}
            </h2>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
              {similar.map((other) => (
                <li key={other.slug}>
                  <SimilarCard project={project} other={other} locale={locale} dict={dict} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </>
  );
}

function ZonePanel({ zone, locale, dict }: { zone: MasterPlanZone; locale: Locale; dict: Dictionary }) {
  const p = dict.projectPage;
  const counts = [zone.buildings && fill(p.buildings, { n: zone.buildings }), zone.units && fill(p.unitsN, { n: formatNumber(zone.units, locale) })]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      {zone.phase && <span className="text-[13px] font-semibold text-brass">{zone.phase[locale]}</span>}
      <h3 className="font-display text-2xl leading-snug font-medium">{zone.name[locale]}</h3>
      <p className="text-body">{zone.description[locale]}</p>
      <dl className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col-reverse rounded-[14px] bg-ground px-3.5 py-3">
          <dt className="text-xs text-muted">{p.zoneArea}</dt>
          <dd className="font-semibold">{zone.areaFeddan ? fill(p.feddan, { n: zone.areaFeddan }) : "—"}</dd>
        </div>
        <div className="flex flex-col-reverse rounded-[14px] bg-ground px-3.5 py-3">
          <dt className="text-xs text-muted">{p.zoneCounts}</dt>
          <dd className="font-semibold">{counts || "—"}</dd>
        </div>
      </dl>
      {zone.subTypes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{p.zoneUnits}</span>
          <ul className="flex flex-wrap gap-1.5">
            {zone.subTypes.map((t) => (
              <li key={t} className="rounded-full bg-brass-soft px-3 py-1 text-[13px] text-brass-dark">
                {dict.subTypes[t]}
              </li>
            ))}
          </ul>
        </div>
      )}
      <a
        href="#units"
        className="mt-auto inline-flex min-h-12 items-center justify-center rounded-[14px] bg-brand font-medium text-white no-underline hover:bg-brand-2 hover:text-white"
      >
        {p.seeUnits}
      </a>
    </>
  );
}

function UnitCard({ typology: t, locale, dict }: { typology: Typology; locale: Locale; dict: Dictionary }) {
  const p = dict.projectPage;
  const extra = [t.gardenM2 && fill(p.garden, { n: t.gardenM2 }), t.roofM2 && fill(p.roof, { n: t.roofM2 })].filter(Boolean).join(" · ");
  const rows: [string, string][] = [
    [p.unitArea, `${t.buaM2} ${locale === "ar" ? "م²" : "m²"}`],
    ...(t.bedrooms ? ([[p.rooms, fill(p.roomsValue, { bed: t.bedrooms, bath: t.bathrooms ?? 1 })]] as [string, string][]) : []),
    [p.outdoor, extra || "—"],
    [p.finishing, dict.finishing[t.finishing]],
  ];
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-surface">
      <div className="flex h-55 flex-col items-center justify-center gap-1 border-b border-divider bg-white/[0.03] text-[13px] text-muted">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="#6f8a87" strokeWidth="1.5" aria-hidden="true">
          <rect x="6" y="6" width="60" height="60" />
          <path d="M6 34h30V6M36 50h30M46 34v32" />
        </svg>
        <span>{p.floorPlan}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-[19px] font-medium">{t.name[locale]}</h3>
          <span dir="ltr" className="text-xs text-muted">
            {t.code}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-3.5 gap-y-1.5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto flex flex-col border-t border-divider pt-3">
          <span className="text-xs text-muted">{dict.common.startingFrom}</span>
          <span className="font-display text-lg font-medium">{formatMoney(t.priceFrom, locale)}</span>
        </div>
      </div>
    </article>
  );
}

function PlanCard({ plan, price, locale, dict }: { plan: PaymentPlan; price: number; locale: Locale; dict: Dictionary }) {
  const p = dict.projectPage;
  const cash = isCashPlan(plan);
  const count = plan.years * INSTALLMENTS_PER_YEAR[plan.frequency];
  const installment = cash ? 0 : (price * (100 - plan.downPaymentPct - plan.deliveryPaymentPct)) / 100 / count;
  const example = cash
    ? formatMoney(price * (1 - (plan.cashDiscountPct ?? 0) / 100), locale)
    : `~${formatMoney(Math.round(installment / 50) * 50, locale)} ${dict.frequencyPer[plan.frequency]}`;
  const rows: [string, string][] = [
    [p.planYears, cash ? "—" : fill(dict.common.years, { n: plan.years })],
    [p.planFrequency, cash ? p.oneOff : dict.frequency[plan.frequency]],
    [p.planDelivery, cash ? "—" : plan.deliveryPaymentPct ? `${plan.deliveryPaymentPct}%` : p.none],
    [fill(p.planExample, { price: formatMillions(price, locale) }), example],
  ];
  return (
    <article className="flex h-full flex-col gap-4 rounded-[22px] border border-line bg-surface p-6">
      <h3 className="font-display text-xl font-medium">{plan.name[locale]}</h3>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-[44px] leading-none font-light">{cash ? plan.cashDiscountPct : plan.downPaymentPct}%</span>
        <span className="text-muted">{cash ? p.off : p.down}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3.5 gap-y-1.5 border-t border-divider pt-3.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function SimilarCard({ project, other, locale, dict }: { project: Project; other: Project; locale: Locale; dict: Dictionary }) {
  return (
    <Link
      href={compareHref(locale, [project.slug, other.slug])}
      className="flex items-center gap-3.5 rounded-[20px] border border-line bg-surface p-3.5 text-ink no-underline hover:border-ink hover:text-ink"
    >
      <span className="relative h-20 w-24 flex-none overflow-hidden rounded-[14px]">
        <ProjectArt seed={other.slug} kind={artKindFor(other)} tone="dusk" className="absolute inset-0 size-full" />
      </span>
      <span className="flex flex-col leading-normal">
        <span className="font-display text-[17px] font-medium">{other.name[locale]}</span>
        <span className="text-[13px] text-muted">
          {dict.areas[other.areaSlug]} · {dict.common.startingFrom} {formatMillions(summarize(other).startingPrice, locale)}
        </span>
        <span className="text-[13px] font-semibold text-link">{fill(dict.projectPage.compareWith, { name: project.name[locale] })}</span>
      </span>
    </Link>
  );
}
