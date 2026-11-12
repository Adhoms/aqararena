import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BellRinging } from "@phosphor-icons/react/ssr";
import { CompareButton } from "@/components/compare/compare-button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { ContactGrid, ContactStack } from "@/components/contact-list";
import { JsonLd } from "@/components/json-ld";
import { MasterPlan } from "@/components/project/master-plan";
import { PaymentCalculator } from "@/components/project/payment-calculator";
import { PriceHistory } from "@/components/project/price-history";
import { ShowUnitsLink, UnitInventory, type InventoryRow } from "@/components/project/unit-inventory";
import { PriceAlertForm } from "@/components/price-alert-form";
import { ShareButton } from "@/components/share-button";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { Tabs, type Tab } from "@/components/tabs";
import { ProjectVsMarket, ValueRing, valueText } from "@/components/insights";
import { artKindFor, ProjectArt } from "@/components/project-art";
import { ProjectCover } from "@/components/project-cover";
import { DeveloperLogo } from "@/components/developer-logo";
import { mapLabels, toMapPoints } from "@/components/map/map-points";
import { ProjectMap } from "@/components/map/project-map";
import { Container, Eyebrow } from "@/components/ui";
import {
  getDeveloper,
  getMarketInsights,
  getProject,
  getProjectUnits,
  isCashPlan,
  monthlyFor,
  listProjectSlugs,
  searchProjects,
  summarize,
  unitName,
  type Developer,
  type MasterPlanZone,
  type PaymentPlan,
  type Project,
  type Typology,
  type Unit,
} from "@/lib/catalog";
import { compareHref } from "@/lib/compare";
import { fill, formatMillions, formatMoney, formatNumber } from "@/lib/format";
import { INSTALLMENTS_PER_YEAR, PHOTO_GROUPS, UNIT_AVAILABILITY, type SubType } from "@/lib/property";
import { pageAlternates, SITE_URL } from "@/lib/site";
import { getDictionary, getLocale, type Dictionary } from "../../dictionaries";

type Locale = "ar" | "en";

export async function generateStaticParams() {
  return (await listProjectSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/projects/[slug]">): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const [project, dict] = await Promise.all([getProject(slug), getDictionary()]);
  if (!project) return {};
  const developer = await getDeveloper(project.developerSlug);
  const description = describe(project, developer, dict, locale);
  return {
    title: project.name[locale],
    description,
    alternates: pageAlternates(locale, `/projects/${slug}`),
    openGraph: { title: project.name[locale], description, url: `/${locale}/projects/${slug}`, type: "website" },
  };
}

/** One sentence with the numbers people search for, for Google and link previews. */
function describe(project: Project, developer: Developer | undefined, dict: Dictionary, locale: Locale) {
  const s = summarize(project);
  return fill(dict.projectPage.metaDescription, {
    name: project.name[locale],
    dev: developer?.name[locale] ?? "",
    place: [project.district[locale], dict.areas[project.areaSlug]].filter(Boolean).join(locale === "ar" ? "، " : ", "),
    price: formatMillions(s.startingPrice, locale),
    down: s.minDownPct,
    years: s.maxYears,
    year: project.deliveryYear,
  });
}

/**
 * Projects a visitor would weigh against this one: same area and type first, then a similar
 * starting price. Unrelated projects are left out rather than padding the list.
 */
function similarTo(project: Project, all: Project[]) {
  const price = summarize(project).startingPrice;
  return all
    .filter((x) => x.slug !== project.slug)
    .map((x) => {
      const ratio = summarize(x).startingPrice / price;
      const score =
        (x.areaSlug === project.areaSlug ? 3 : 0) +
        (x.categories.some((c) => project.categories.includes(c)) ? 2 : 0) +
        (ratio > 0.6 && ratio < 1.6 ? 2 : 0) +
        (x.developerSlug === project.developerSlug ? 1 : 0);
      return { x, score, gap: Math.abs(Math.log(ratio)) };
    })
    .filter((r) => r.score >= 4)
    .sort((a, b) => b.score - a.score || a.gap - b.gap)
    .slice(0, 3)
    .map((r) => r.x);
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
  const [all, insights, inventory] = await Promise.all([searchProjects({}), getMarketInsights(), getProjectUnits(slug)]);
  // Units of a type that is no longer shown are left out.
  const units = inventory.units.filter((u) => project.typologies.some((t) => t.code === u.typologyCode));
  const stock = stockByType(units);
  const dateLocale = locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
  const similar = similarTo(project, all);
  const hasPlan = project.zones.length > 0 || Boolean(project.masterPlanUrl);
  const floorPlans = project.floorPlans ?? [];
  const hasPhotos = project.photos.length > 0 || floorPlans.length > 0;
  const hasContacts = Object.values(developer.contacts).some(Boolean);
  const mapPoints = toMapPoints([project], [developer], insights, dict, locale);
  const hasLocation = mapPoints.length > 0 || project.distances.length > 0;

  // Only the sections this project has something to show in.
  const sections = (
    [
      ["overview", p.sections.overview, true],
      ["market", dict.insights.vsMarket, Boolean(insights.values[project.slug])],
      ["masterplan", p.sections.masterplan, hasPlan],
      ["units", p.sections.units, true],
      ["prices", p.sections.prices, true],
      ["photos", p.sections.photos, hasPhotos],
      ["location", p.sections.location, hasLocation],
      ["contact", p.sections.contact, true],
    ] as const
  ).filter(([, , shown]) => shown);

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
    [p.planYears, s.maxYears ? fill(dict.common.years, { n: s.maxYears }) : "-"],
    [dict.common.delivery, String(project.deliveryYear)],
  ];

  const url = `${SITE_URL}/${locale}/projects/${project.slug}`;
  return (
    <>
      {/* What search engines read: a real-estate listing with its price range, place and developer. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "RealEstateListing",
          name: project.name[locale],
          description: project.description[locale],
          url,
          inLanguage: locale,
          ...(project.pricesUpdated && { dateModified: project.pricesUpdated }),
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "EGP",
            lowPrice: s.startingPrice,
            highPrice: Math.max(...project.typologies.map((t) => t.priceFrom)),
            offerCount: project.typologies.length,
          },
          about: {
            "@type": "ApartmentComplex",
            name: project.name[locale],
            address: { "@type": "PostalAddress", addressLocality: dict.areas[project.areaSlug], addressCountry: "EG" },
            ...(project.location && { geo: { "@type": "GeoCoordinates", latitude: project.location.lat, longitude: project.location.lng } }),
          },
          provider: { "@type": "Organization", name: developer.name[locale], url: `${SITE_URL}/${locale}/developers/${developer.slug}` },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: dict.nav.homeShort, item: `${SITE_URL}/${locale}` },
            { "@type": "ListItem", position: 2, name: dict.nav.projects, item: `${SITE_URL}/${locale}/projects` },
            { "@type": "ListItem", position: 3, name: project.name[locale], item: url },
          ],
        }}
      />
      {/* ─── Hero: the project's scene, full width, with the key numbers on top ─── */}
      <section className="relative isolate overflow-hidden bg-deep text-white">
        <ProjectCover project={project} eager className="absolute inset-0 -z-10 size-full" />
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
            <Link href={`/${locale}/areas/${project.areaSlug}`} className="text-on-dark hover:text-white">
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
                <WhatsAppShare
                  text={fill(dict.whatsappShare.project, {
                    name: project.name[locale],
                    dev: developer.name[locale],
                    place: dict.areas[project.areaSlug],
                    price: formatMoney(s.startingPrice, locale),
                  })}
                  url={url}
                  label={dict.whatsappShare.send}
                  className="min-h-12 rounded-full border border-white/30 bg-white/10 px-5 text-[15px] text-white backdrop-blur hover:bg-white/20 hover:text-white"
                />
                <CompareButton
                  slug={project.slug}
                  name={project.name}
                  labels={{ add: dict.common.addToCompare, added: dict.common.inCompare }}
                  className="press min-h-12 rounded-full border-0 bg-brass-light! px-5.5 text-brand! hover:bg-[#d8bc86]!"
                />
                <FavoriteButton slug={project.slug} variant="onImage" labels={{ add: dict.favorites.add, remove: dict.favorites.remove }} className="size-12" />
                {project.brochureUrl && (
                  <a
                    href={project.brochureUrl}
                    target="_blank"
                    rel="noopener"
                    className="press inline-flex min-h-12 items-center rounded-full border border-white/30 bg-white/10 px-5 text-[15px] text-white no-underline backdrop-blur hover:bg-white/20 hover:text-white"
                  >
                    {p.brochure}
                  </a>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/15 bg-white/10 backdrop-blur-md sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
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
            <dl className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-px overflow-hidden rounded-2xl border border-line bg-line">
              {facts.map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse gap-0.5 bg-surface p-4.5">
                  <dt className="text-[13px] text-muted">{label}</dt>
                  <dd className="font-display text-xl font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {project.amenities.length > 0 && (
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
            )}
          </div>

          <aside aria-label={p.officialNumbers} className="flex flex-[1_1_320px] flex-col gap-4.5 rounded-3xl border border-line bg-surface p-6">
            <div className="flex flex-col">
              <span className="text-[13px] text-muted">{p.pricesFrom}</span>
              <span className="font-display text-[32px] font-medium">{formatMoney(s.startingPrice, locale)}</span>
              <span className="text-sm text-muted">{fill(p.priceSummary, { down: s.minDownPct, years: s.maxYears })}</span>
            </div>
            <div className="flex flex-col gap-2.5 border-t border-divider pt-4">
              <span className="font-semibold">{p.officialNumbers}</span>
              {hasContacts ? (
                <ContactStack developer={developer} dict={dict} locale={locale} limit={4} />
              ) : (
                <p className="text-sm text-muted">{fill(p.contactsPending, { dev: developer.name[locale] })}</p>
              )}
            </div>
            <p className="text-xs text-muted">{p.neutralNote}</p>
          </aside>
        </section>

        {/* Against the market */}
        {value && areaAvg && (
          <section id="market" aria-labelledby="market-title" className="reveal grid gap-8 rounded-3xl border border-line bg-surface p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr]">
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

        {/* Master plan, on a survey-sheet stage */}
        {hasPlan && (
        <section id="masterplan" aria-labelledby="masterplan-title" className="plan-grid reveal flex flex-col gap-6 rounded-3xl border border-line bg-plan p-5 text-ink sm:p-10">
          <div className="flex flex-col gap-1">
            <Eyebrow>{p.masterplanEyebrow}</Eyebrow>
            <h2 id="masterplan-title" className={`${h2} sm:text-4xl`}>
              {p.sections.masterplan}
            </h2>
          </div>
          <MasterPlan
            zones={project.zones.map((z) => ({ id: z.id, kind: z.kind, label: z.short[locale], shape: z.shape }))}
            panels={Object.fromEntries(project.zones.map((z) => [z.id, <ZonePanel key={z.id} zone={z} locale={locale} dict={dict} />]))}
            image={project.masterPlanUrl}
            labels={{ zoomIn: p.zoomIn, zoomOut: p.zoomOut, note: p.planNote, plan: p.sections.masterplan }}
          />
        </section>
        )}

        {/* Unit types */}
        <section id="units" aria-labelledby="units-title" className="flex flex-col gap-8">
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
                          <UnitCard typology={t} stock={stock.get(t.code)} locale={locale} dict={dict} />
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ];
            })}
          />
          {units.length > 0 && (
            <UnitInventory
              rows={inventoryRows(units, project, locale, dict)}
              models={project.typologies.filter((t) => stock.has(t.code)).map((t) => ({ code: t.code, name: unitName(t, dict.subTypes, locale) }))}
              labels={{
                ...dict.inventory,
                availability: dict.availability,
                updated: inventory.updated
                  ? fill(dict.inventory.updated, { date: new Intl.DateTimeFormat(dateLocale, { dateStyle: "long" }).format(new Date(inventory.updated)) })
                  : undefined,
              }}
            />
          )}
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
          {project.bookingFee && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-brass/40 bg-brass-soft px-5 py-4">
              <span className="flex flex-col">
                <span className="font-semibold">{dict.newLaunches.bookingFee}</span>
                <span className="text-[13px] text-muted">{dict.newLaunches.bookingNote}</span>
              </span>
              <span className="font-display text-2xl text-brass">{formatMoney(project.bookingFee, locale)}</span>
            </div>
          )}
          {project.typologies.length > 0 && project.paymentPlans.length > 0 && (
            <PaymentCalculator
              units={[...project.typologies]
                .sort((a, b) => a.priceFrom - b.priceFrom)
                .map((t) => ({ code: t.code, name: unitName(t, dict.subTypes, locale), price: t.priceFrom }))}
              plans={project.paymentPlans}
              maintenancePct={project.fees.maintenancePct}
              locale={locale}
              offerHref={`/${locale}/projects/${project.slug}/offer`}
              labels={{
                ...dict.calculator,
                frequencyPer: dict.frequencyPer,
                planNames: project.paymentPlans.map((plan) => plan.name[locale]),
              }}
            />
          )}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
            {project.paymentPlans.map((plan, i) => (
              <li key={i}>
                <PlanCard plan={plan} price={s.startingPrice} locale={locale} dict={dict} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-x-8 gap-y-2.5 rounded-2xl border border-line bg-surface px-5.5 py-4.5 text-sm">
            {project.fees.maintenancePct !== undefined && (
              <>
                <span className="font-semibold">{p.fees}</span>
                <span>
                  {p.maintenance} <b>{project.fees.maintenancePct}%</b>
                </span>
              </>
            )}
            <span className="text-muted">{p.pricesNote}</span>
          </div>
          {project.priceHistory && <PriceHistory points={project.priceHistory} locale={locale} labels={dict.priceHistory} />}
          <div id="price-alert" className="flex flex-col gap-4 rounded-3xl border border-brand/25 bg-surface p-5.5 sm:p-7 print:hidden">
            <div className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <BellRinging size={22} weight="duotone" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-display text-xl font-medium">{p.priceAlert.title}</span>
                <span className="text-sm text-body">{fill(p.priceAlert.text, { name: project.name[locale] })}</span>
              </span>
            </div>
            <PriceAlertForm
              locale={locale}
              project={project.slug}
              labels={{
                name: p.priceAlert.name,
                email: p.priceAlert.email,
                phone: p.priceAlert.phone,
                optional: p.priceAlert.optional,
                send: p.priceAlert.send,
                sending: p.priceAlert.sending,
                privacy: p.priceAlert.privacy,
              }}
            />
          </div>
        </section>

        {/* Photos */}
        {hasPhotos && (
        <section id="photos" aria-labelledby="photos-title">
          <Tabs
            label={p.photosTitle}
            header={
              <h2 id="photos-title" className={h2}>
                {p.photosTitle}
              </h2>
            }
            tabs={[
              ...(["ALL", ...PHOTO_GROUPS] as const).flatMap((group): Tab[] => {
              const items = project.photos.filter((ph) => group === "ALL" || ph.group === group);
              if (!items.length) return [];
              return [
                {
                  id: group,
                  label: dict.photoGroups[group],
                  content: (
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
                      {items.map((ph, i) => (
                        <li key={i} className="group relative h-56 overflow-hidden rounded-2xl">
                          {ph.url ? (
                            <a href={ph.url} target="_blank" rel="noreferrer" className="absolute inset-0" aria-label={ph.caption[locale] || p.photosTitle}>
                              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photos are already resized WebP */}
                              <img
                                src={ph.url}
                                alt={ph.caption[locale]}
                                width={ph.width}
                                height={ph.height}
                                loading="lazy"
                                decoding="async"
                                className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            </a>
                          ) : (
                            <ProjectArt
                              seed={`${project.slug}-${ph.caption.en}`}
                              kind={ph.group === "CONSTRUCTION" ? "towers" : kind}
                              tone={ph.group === "INTERIOR" ? "day" : ph.group === "CONSTRUCTION" ? "day" : i % 2 ? "night" : "dusk"}
                              label={ph.caption[locale]}
                              className="absolute inset-0 size-full transition-transform duration-700 group-hover:scale-105"
                            />
                          )}
                          {ph.caption[locale] && (
                            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-4 pt-8 pb-3 text-[13px] text-white">
                              {ph.caption[locale]}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ];
            }),
              ...(floorPlans.length
                ? [
                    {
                      id: "PLANS",
                      label: p.floorPlansTab,
                      content: (
                        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
                          {floorPlans.map((fp, i) => (
                            <li key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
                              <a href={fp.url} target="_blank" rel="noreferrer" className="block">
                                {/\.pdf(\?|$)/i.test(fp.url) ? (
                                  <span className="flex h-56 items-center justify-center text-sm text-muted">PDF ↗</span>
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element -- uploaded plans
                                  <img src={fp.url} alt={fp.caption[locale]} loading="lazy" decoding="async" className="h-56 w-full object-contain p-2" />
                                )}
                              </a>
                              {fp.caption[locale] && <p className="border-t border-divider px-4 py-2 text-[13px]">{fp.caption[locale]}</p>}
                            </li>
                          ))}
                        </ul>
                      ),
                    } satisfies Tab,
                  ]
                : []),
            ]}
          />
        </section>
        )}

        {/* Location */}
        {hasLocation && (
        <section id="location" aria-labelledby="location-title" className="flex flex-wrap gap-6">
          {mapPoints.length > 0 && (
            <ProjectMap
              mode="teaser"
              points={mapPoints}
              locale={locale}
              labels={mapLabels(dict)}
              search={false}
              className="h-90 min-w-0 flex-[3_1_520px] overflow-hidden rounded-3xl border border-line"
            />
          )}
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
        )}

        {/* Developer contacts */}
        <section id="contact" aria-labelledby="contact-title" className="flex flex-wrap items-center gap-9 rounded-3xl bg-brand p-8 text-white sm:p-11">
          <div className="flex flex-[1_1_320px] flex-col gap-3.5">
            <DeveloperLogo developer={developer} locale={locale} onDark className="h-16 w-28 rounded-xl" />
            <h2 id="contact-title" className="font-display text-3xl font-normal">
              {fill(p.contactTitle, { dev: developer.name[locale] })}
            </h2>
            <p className="text-on-dark">{developer.verified ? p.contactNote : p.contactNoteUnverified}</p>
            <Link href={`/${locale}/developers/${developer.slug}`} className="font-medium text-brass-light hover:text-white">
              {p.allDevProjects} {locale === "ar" ? "←" : "→"}
            </Link>
          </div>
          {hasContacts ? (
            <ContactGrid developer={developer} dict={dict} locale={locale} />
          ) : (
            <p className="flex-[1_1_420px] rounded-2xl bg-brand-2 px-5 py-4 text-on-dark">{fill(p.contactsPending, { dev: developer.name[locale] })}</p>
          )}
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
        <div className="flex flex-col-reverse rounded-2xl bg-ground px-3.5 py-3">
          <dt className="text-xs text-muted">{p.zoneArea}</dt>
          <dd className="font-semibold">{zone.areaFeddan ? fill(p.feddan, { n: zone.areaFeddan }) : "-"}</dd>
        </div>
        <div className="flex flex-col-reverse rounded-2xl bg-ground px-3.5 py-3">
          <dt className="text-xs text-muted">{p.zoneCounts}</dt>
          <dd className="font-semibold">{counts || "-"}</dd>
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
        className="mt-auto inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand font-medium text-white no-underline hover:bg-brand-2 hover:text-white"
      >
        {p.seeUnits}
      </a>
    </>
  );
}

/** How many units each type has, and how many of them are still available. */
function stockByType(units: Unit[]) {
  const stock = new Map<string, { available: number; total: number }>();
  for (const u of units) {
    const s = stock.get(u.typologyCode) ?? { available: 0, total: 0 };
    s.total++;
    if (u.availability === "AVAILABLE") s.available++;
    stock.set(u.typologyCode, s);
  }
  return stock;
}

/** The inventory worded for the page: available units first, cheapest first. */
function inventoryRows(units: Unit[], project: Project, locale: Locale, dict: Dictionary): InventoryRow[] {
  const i = dict.inventory;
  const typeName = new Map(project.typologies.map((t) => [t.code, unitName(t, dict.subTypes, locale)]));
  // A value from the lists is translated; anything else is shown as the developer wrote it.
  const worded = (labels: Record<string, string>, value: string | undefined) => (value ? (labels[value] ?? value) : undefined);
  return [...units]
    .sort(
      (a, b) =>
        UNIT_AVAILABILITY.indexOf(a.availability) - UNIT_AVAILABILITY.indexOf(b.availability) ||
        (a.price ?? Infinity) - (b.price ?? Infinity) ||
        (a.number ?? "").localeCompare(b.number ?? "", undefined, { numeric: true }),
    )
    .map((u) => ({
      id: u.id,
      model: u.typologyCode,
      modelName: typeName.get(u.typologyCode) ?? u.typologyCode,
      label: [u.building && fill(i.building, { b: u.building }), u.number].filter(Boolean).join(" · ") || "-",
      floor: u.floor === undefined ? undefined : u.floor === 0 ? i.ground : formatNumber(u.floor, locale),
      view: worded(dict.unitViews, u.view),
      orientation: worded(dict.orientations, u.orientation),
      price: u.price ? formatMoney(u.price, locale) : undefined,
      availability: u.availability,
    }));
}

function UnitCard({
  typology: t,
  stock,
  locale,
  dict,
}: {
  typology: Typology;
  stock?: { available: number; total: number };
  locale: Locale;
  dict: Dictionary;
}) {
  const p = dict.projectPage;
  const extra = [t.gardenM2 && fill(p.garden, { n: t.gardenM2 }), t.roofM2 && fill(p.roof, { n: t.roofM2 })].filter(Boolean).join(" · ");
  const rows: [string, string][] = [
    [p.unitArea, `${t.buaM2} ${locale === "ar" ? "م²" : "m²"}`],
    ...(t.bedrooms ? ([[p.rooms, fill(p.roomsValue, { bed: t.bedrooms, bath: t.bathrooms ?? 1 })]] as [string, string][]) : []),
    [p.outdoor, extra || "-"],
    [p.finishing, dict.finishing[t.finishing]],
  ];
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-[19px] font-medium">{unitName(t, dict.subTypes, locale)}</h3>
          {t.name[locale] && (
            <span dir="ltr" className="text-xs text-muted">
              {t.code}
            </span>
          )}
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
        {stock && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm print:hidden">
            <span className={stock.available ? "font-semibold text-brass-dark" : "text-muted"}>
              {fill(dict.inventory.availableOf, { a: formatNumber(stock.available, locale), n: formatNumber(stock.total, locale) })}
            </span>
            <ShowUnitsLink code={t.code} className="font-semibold">
              {dict.inventory.show}
            </ShowUnitsLink>
          </div>
        )}
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
  const round = (n: number) => formatMoney(Math.round(n / 50) * 50, locale);
  const rows: [string, string][] = [
    [p.planYears, cash ? "-" : fill(dict.common.years, { n: plan.years })],
    [p.planFrequency, cash ? p.oneOff : dict.frequency[plan.frequency]],
    [p.planDelivery, cash ? "-" : plan.deliveryPaymentPct ? `${plan.deliveryPaymentPct}%` : p.none],
    [fill(p.planExample, { price: formatMillions(price, locale) }), example],
    ...(cash
      ? []
      : ([
          [p.downAmount, round((price * plan.downPaymentPct) / 100)],
          ...(plan.deliveryPaymentPct ? [[p.deliveryAmount, round((price * plan.deliveryPaymentPct) / 100)]] : []),
          ...(plan.frequency !== "MONTHLY" ? [[p.monthlyEq, `~${round(monthlyFor(price, plan))}`]] : []),
        ] as [string, string][])),
  ];
  return (
    <article className="flex h-full flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
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
      className="flex items-center gap-3.5 rounded-3xl border border-line bg-surface p-3.5 text-ink no-underline hover:border-ink hover:text-ink"
    >
      <span className="relative h-20 w-24 flex-none overflow-hidden rounded-2xl">
        <ProjectCover project={other} className="absolute inset-0 size-full" />
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

