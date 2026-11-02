import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { pageAlternates, SITE_URL } from "@/lib/site";
import { ValueRing, AreaPriceBars, valueText } from "@/components/insights";
import { mapLabels, toMapPoints } from "@/components/map/map-points";
import { ProjectMap } from "@/components/map/project-map";
import { artKindFor, ProjectArt } from "@/components/project-art";
import { FeaturedShowcase } from "@/components/featured-showcase";
import { smartLabels } from "@/components/smart-labels";
import { SmartSearch } from "@/components/smart-search";
import { ArrowIcon, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { Buildings, Check, Coins, Images, MapTrifold, Phone, Wallet } from "@phosphor-icons/react/ssr";
import {
  countProjectsByDeveloper,
  getFeaturedProjects,
  getMarketInsights,
  listDevelopers,
  listProjects,
  summarize,
  type Project,
} from "@/lib/catalog";
import { compareHref } from "@/lib/compare";
import { fill, formatMillions } from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "./dictionaries";

// One icon per "what every project page shows" item, in the dictionary's order.
const PILLAR_ICONS = [MapTrifold, Coins, Buildings, Images, Phone];

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: pageAlternates(await getLocale()) };
}

export default async function HomePage() {
  const [locale, dict, featured, all, developers, devCounts, insights] = await Promise.all([
    getLocale(),
    getDictionary(),
    getFeaturedProjects(),
    listProjects(),
    listDevelopers(),
    countProjectsByDeveloper(),
    getMarketInsights(),
  ]);
  const devBySlug = new Map(developers.map((d) => [d.slug, d]));
  const heroProject = featured[0] ?? all[0];
  const bestValue = [...all].sort((a, b) => (insights.values[b.slug]?.score ?? 0) - (insights.values[a.slug]?.score ?? 0)).slice(0, 3);
  const [first, second] = featured;

  return (
    <>
      {/* Lets search engines show a search box for the site, wired to the smart search. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "AqarArena",
          url: `${SITE_URL}/${locale}`,
          inLanguage: locale,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/${locale}/projects?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      {/* ─── Hero: full screen, the search is the star ─────────────── */}
      <section className="relative isolate overflow-hidden bg-deep text-white">
        {heroProject && (
          <ProjectArt
            seed={`${heroProject.slug}-hero`}
            kind={artKindFor(heroProject)}
            tone="dusk"
            className="absolute inset-0 -z-10 size-full opacity-80"
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-deep/70 via-deep/40 to-deep" />
        <Container className="flex min-h-[calc(100dvh-10rem)] flex-col justify-center gap-9 pt-20 pb-20">
          <div className="rise flex max-w-5xl flex-col gap-6">
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="h-px w-10 bg-brass-light/70" />
              <Eyebrow onDark>{dict.hero.kicker}</Eyebrow>
            </span>
            <h1 className="font-display text-[44px] leading-[1.2] font-light tracking-[-0.02em] sm:text-[64px] lg:text-[76px] ltr:leading-[1.02]">
              {dict.hero.line1}
              <br />
              <span className="text-brass-light">{dict.hero.line2}</span>
            </h1>
            <p className="max-w-[58ch] text-lg leading-relaxed text-on-dark sm:text-xl">{dict.hero.sub}</p>
          </div>
          <div className="rise max-w-4xl [animation-delay:120ms]">
            <SmartSearch locale={locale} labels={smartLabels(dict)} variant="hero" />
          </div>
        </Container>
      </section>

      {/* ─── Catalogue in numbers: its own strip under the hero ───────── */}
      <Container className="rise relative z-10 [animation-delay:240ms]">
        <dl className="-mt-10 grid grid-cols-3 rounded-3xl border border-line bg-surface">
          {[
            [all.length, dict.home.statProjects],
            [developers.length, dict.home.statDevelopers],
            [insights.areas.length, dict.home.statAreas],
          ].map(([value, label], i) => (
            <div key={label} className={`flex flex-col-reverse gap-1 px-4 py-6 sm:px-8 ${i ? "border-s border-line" : ""}`}>
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="font-display text-3xl font-light text-ink sm:text-5xl">{value}</dd>
            </div>
          ))}
        </dl>
      </Container>

      {/* ─── Search by budget: down payment + monthly, not a unit price ─ */}
      <BudgetSearch locale={locale} dict={dict} />

      {/* ─── Featured projects: an expanding gallery ────────────────── */}
      <Container className="reveal flex flex-col gap-9 pt-24 sm:pt-28">
        <SectionHeading
          title={dict.home.featuredTitle}
          action={
            <Link href={`/${locale}/projects`} className="group inline-flex min-h-11 items-center gap-2 font-medium no-underline">
              {dict.home.allProjects} <ArrowIcon locale={locale} />
            </Link>
          }
        />
        <FeaturedShowcase projects={featured} developers={devBySlug} values={insights.values} locale={locale} dict={dict} />
      </Container>

      {/* ─── Market insights ───────────────────────────────────────── */}
      <section id="areas" aria-labelledby="insights-title" className="pt-24 sm:pt-28">
        <Container className="reveal">
          <div className="grid grid-cols-1 gap-8 rounded-3xl border border-line bg-surface p-5 sm:p-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Eyebrow>{dict.insights.eyebrow}</Eyebrow>
                <h2 id="insights-title" className="font-display text-[32px] font-light tracking-[-0.015em] sm:text-[42px]">
                  {dict.insights.title}
                </h2>
                <p className="text-sm text-muted">{dict.insights.note}</p>
              </div>
              <AreaPriceBars insights={insights} dict={dict} locale={locale} />
            </div>
            <div className="flex min-w-0 flex-col gap-4 rounded-2xl bg-brand p-5 text-white sm:p-6">
              <span className="font-display text-xl font-medium">{dict.insights.bestValue}</span>
              <ol className="flex flex-col gap-3">
                {bestValue.map((p, i) => (
                  <BestValueRow key={p.slug} project={p} rank={i + 1} locale={locale} dict={dict} value={insights.values[p.slug]} />
                ))}
              </ol>
              <p className="mt-auto text-xs text-on-dark-muted">{dict.insights.scoreHelp}</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── Map ───────────────────────────────────────────────────── */}
      <section aria-labelledby="map-title" className="reveal pt-24 sm:pt-28">
        <Container className="flex flex-wrap items-end justify-between gap-4 pb-8">
          <div className="flex flex-col gap-2">
            <h2 id="map-title" className="font-display text-[32px] font-light tracking-[-0.015em] sm:text-[42px]">
              {dict.map.teaserTitle}
            </h2>
            <p className="max-w-xl text-muted">{dict.map.teaserText}</p>
          </div>
          <Link
            href={`/${locale}/map`}
            className="press group inline-flex min-h-12 items-center gap-2.5 rounded-full bg-brand ps-6 pe-2 font-medium text-white no-underline hover:bg-brand-2 hover:text-white"
          >
            {dict.map.open}
            <span className="flex size-8 items-center justify-center rounded-full bg-white/10">
              <ArrowIcon locale={locale} size={16} />
            </span>
          </Link>
        </Container>
        <Container>
          <ProjectMap
            mode="teaser"
            points={toMapPoints(all, developers, insights, dict, locale)}
            locale={locale}
            labels={mapLabels(dict)}
            className="h-[min(520px,70dvh)] overflow-hidden rounded-3xl border border-line"
          />
        </Container>
      </section>

      {/* ─── What every project page shows ─────────────────────────── */}
      <section aria-labelledby="pillars-title" className="reveal pt-24 sm:pt-28">
        <Container className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <div className="flex flex-col gap-8">
            <h2 id="pillars-title" className="font-display text-[32px] font-light tracking-[-0.015em] sm:text-[42px]">
              {dict.home.pillarsTitle}
            </h2>
            {dict.home.pillars.slice(0, 1).map((pillar) => (
              <div
                key={pillar.title}
                className="plan-grid relative isolate flex min-h-72 flex-1 flex-col justify-end gap-3 overflow-hidden rounded-3xl border border-line bg-plan p-7 sm:p-9"
              >
                <MapTrifold size={44} weight="light" aria-hidden="true" className="text-brass" />
                <h3 className="font-display text-2xl font-medium">{pillar.title}</h3>
                <p className="max-w-[42ch] text-body">{pillar.text}</p>
              </div>
            ))}
          </div>
          <ul className="grid grid-cols-1 content-center gap-x-10 gap-y-12 sm:grid-cols-2">
            {dict.home.pillars.slice(1).map((pillar, i) => {
              const Icon = PILLAR_ICONS[i + 1];
              return (
                <li key={pillar.title} className="flex flex-col gap-3">
                  <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl bg-brass-soft text-brass">
                    <Icon size={24} />
                  </span>
                  <h3 className="font-display text-lg font-medium">{pillar.title}</h3>
                  <p className="max-w-[36ch] text-sm text-muted">{pillar.text}</p>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* ─── Compare: two projects face to face ─────────────────────── */}
      {first && second && (
        <section aria-labelledby="compare-title" className="reveal pt-24 sm:pt-28">
          <Container>
            <div className="plan-grid flex flex-col items-center gap-10 rounded-3xl border border-line bg-plan px-5 py-12 text-center sm:px-12 sm:py-16">
              <div className="flex flex-col items-center gap-4">
                <Eyebrow>{dict.home.compareEyebrow}</Eyebrow>
                <h2 id="compare-title" className="font-display text-[32px] leading-[1.2] font-light tracking-[-0.015em] sm:text-[44px]">
                  {dict.home.compareTitleLine1} {dict.home.compareTitleLine2}
                </h2>
                <p className="max-w-[56ch] text-body">{dict.home.compareText}</p>
              </div>
              <FaceOff locale={locale} dict={dict} a={first} b={second} />
              <Link
                href={compareHref(locale, [first.slug, second.slug])}
                className="press group inline-flex min-h-13 items-center gap-3 rounded-full bg-brand ps-7 pe-2 font-semibold text-white no-underline hover:bg-brand-2 hover:text-white"
              >
                {dict.home.compareCta}
                <span className="flex size-9 items-center justify-center rounded-full bg-white/12">
                  <ArrowIcon locale={locale} size={16} />
                </span>
              </Link>
            </div>
          </Container>
        </section>
      )}

      {/* ─── Developers: a slow strip of names ─────────────────────── */}
      <section aria-labelledby="developers-title" className="reveal pt-24 pb-28 sm:pt-28">
        <Container>
          <SectionHeading
            title={<span id="developers-title">{dict.home.developersTitle}</span>}
            action={
              <Link href={`/${locale}/developers`} className="group inline-flex min-h-11 items-center gap-2 font-medium no-underline">
                {dict.home.allDevelopers} <ArrowIcon locale={locale} />
              </Link>
            }
          />
        </Container>
        <div className="marquee mt-9 overflow-hidden border-y border-line py-6">
          <div className="marquee-track flex w-max gap-4">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1 ? true : undefined} className="flex gap-4">
                {developers.map((d) => (
                  <li key={d.slug}>
                    <Link
                      href={`/${locale}/developers/${d.slug}`}
                      tabIndex={copy === 1 ? -1 : undefined}
                      className="press flex items-center gap-4 rounded-full border border-line bg-surface py-2 ps-2 pe-6 text-ink no-underline hover:border-brass hover:text-ink"
                    >
                      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-brand font-display text-lg text-brass-light">
                        {d.name.en.replace("Developer ", "").charAt(0)}
                      </span>
                      <span className="flex flex-col">
                        <span className="font-semibold whitespace-nowrap">{d.name[locale]}</span>
                        <span className="text-[13px] whitespace-nowrap text-muted">{fill(dict.common.projectsCount, { n: devCounts[d.slug] ?? 0 })}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function BestValueRow({
  project,
  rank,
  locale,
  dict,
  value,
}: {
  project: Project;
  rank: number;
  locale: "ar" | "en";
  dict: Dictionary;
  value?: { score: number; vsAreaPct: number; areaRank: number; areaCount: number };
}) {
  return (
    <li>
      <Link
        href={`/${locale}/projects/${project.slug}`}
        className="press flex items-center gap-3.5 rounded-xl bg-brand-2 p-3 text-white no-underline hover:bg-brand-3 hover:text-white"
      >
        <span className="w-5 flex-none text-center font-display text-lg text-on-dark-muted">{rank}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display font-medium">{project.name[locale]}</span>
          <span className="truncate text-xs text-on-dark-muted">
            {dict.areas[project.areaSlug]} · {formatMillions(summarize(project).startingPrice, locale)}
          </span>
          {value && <span className="truncate text-xs text-brass-light">{valueText(value, dict)}</span>}
        </span>
        {value && <ValueRing score={value.score} label={dict.insights.score} onDark />}
      </Link>
    </li>
  );
}

/** Two projects face to face: names on either side, each figure beside its project, the better one marked. */
function FaceOff({ locale, dict, a, b }: { locale: "ar" | "en"; dict: Dictionary; a: Project; b: Project }) {
  const sa = summarize(a);
  const sb = summarize(b);
  const rows: [string, string, string, number, number, "low" | "high"][] = [
    [dict.common.startingFrom, formatMillions(sa.startingPrice, locale), formatMillions(sb.startingPrice, locale), sa.startingPrice, sb.startingPrice, "low"],
    [dict.common.lowestDown, `${sa.minDownPct}%`, `${sb.minDownPct}%`, sa.minDownPct, sb.minDownPct, "low"],
    [dict.comparePage.rows.maxYears, fill(dict.common.years, { n: sa.maxYears }), fill(dict.common.years, { n: sb.maxYears }), sa.maxYears, sb.maxYears, "high"],
    [dict.common.delivery, String(a.deliveryYear), String(b.deliveryYear), a.deliveryYear, b.deliveryYear, "low"],
  ];
  const better = (x: number, y: number, dir: "low" | "high") => (x === y ? false : dir === "low" ? x < y : x > y);
  const cell = (text: string, win: boolean, side: "a" | "b") => (
    <span className={`flex items-center gap-2 font-display text-lg sm:text-2xl ${side === "a" ? "justify-end" : "justify-start"} ${win ? "text-brass" : "text-ink"}`}>
      {win && side === "b" && <Check size={18} weight="bold" aria-hidden="true" />}
      {text}
      {win && side === "a" && <Check size={18} weight="bold" aria-hidden="true" />}
    </span>
  );

  return (
    <div className="w-full max-w-3xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
        <span className="text-end font-display text-2xl font-medium text-ink sm:text-4xl">{a.name[locale]}</span>
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full border border-brass/40 bg-surface font-display text-sm text-brass sm:size-14">
          VS
        </span>
        <span className="text-start font-display text-2xl font-medium text-ink sm:text-4xl">{b.name[locale]}</span>
      </div>
      <ul className="mt-8 flex flex-col gap-1">
        {rows.map(([label, va, vb, na, nb, dir]) => (
          <li
            key={label}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,1fr)] items-center gap-3 rounded-2xl px-2 py-3 odd:bg-surface/70 sm:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)] sm:gap-6"
          >
            {cell(va, better(na, nb, dir), "a")}
            <span className="text-center text-[13px] text-muted">{label}</span>
            {cell(vb, better(nb, na, dir), "b")}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Tell us what you have": cash for the down payment + the monthly installment → matching projects. */
function BudgetSearch({ locale, dict }: { locale: "ar" | "en"; dict: Dictionary }) {
  const b = dict.budget;
  const field =
    "min-h-13 w-full rounded-2xl border border-line-strong bg-surface px-4 text-base text-ink focus:border-brand focus:outline-none";
  return (
    <section aria-labelledby="budget-title" className="reveal pt-24 sm:pt-28">
      <Container>
        <div className="grid grid-cols-1 gap-8 rounded-3xl border border-line bg-surface p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
          <div className="flex flex-col gap-4">
            <span className="flex items-center gap-2.5 text-brass">
              <Wallet size={26} weight="light" aria-hidden="true" />
              <Eyebrow>{b.eyebrow}</Eyebrow>
            </span>
            <h2 id="budget-title" className="font-display text-[30px] leading-[1.25] font-light tracking-[-0.015em] sm:text-[40px]">
              {b.title}
            </h2>
            <p className="max-w-[52ch] text-body">{b.text}</p>
          </div>
          <div className="flex flex-col gap-4">
            <form action={`/${locale}/projects`} method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-body">
                {b.cash}
                <input type="number" name="cash" min={0} step={50000} inputMode="numeric" placeholder={b.cashPlaceholder} className={field} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-body">
                {b.monthly}
                <input type="number" name="monthly" min={0} step={1000} inputMode="numeric" placeholder={b.monthlyPlaceholder} className={field} />
              </label>
              <button
                type="submit"
                className="press min-h-13 rounded-2xl bg-brand px-6 font-semibold text-white hover:bg-brand-2 sm:col-span-2"
              >
                {b.submit}
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">{b.examplesLabel}</span>
              {b.examples.map((ex) => {
                const qs = new URLSearchParams({ cash: String(ex.cash), ...(ex.monthly ? { monthly: String(ex.monthly) } : {}) });
                return (
                  <Link
                    key={ex.label}
                    href={`/${locale}/projects?${qs}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-ink no-underline hover:border-ink hover:text-ink"
                  >
                    {ex.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
