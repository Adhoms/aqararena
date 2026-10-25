import Link from "next/link";
import { Buildings, Check, Coins, Images, MapTrifold, Phone } from "@phosphor-icons/react/ssr";
import { CompareButton } from "@/components/compare/compare-button";
import { ValueRing, valueText } from "@/components/insights";
import { mapLabels, toMapPoints } from "@/components/map/map-points";
import { ProjectMap } from "@/components/map/project-map";
import { artKindFor, ProjectArt } from "@/components/project-art";
import { smartLabels } from "@/components/smart-labels";
import { SmartSearch } from "@/components/smart-search";
import { ArrowIcon, Container, Eyebrow } from "@/components/ui";
import {
  countProjectsByDeveloper,
  getFeaturedProjects,
  getMarketInsights,
  listDevelopers,
  listProjects,
  summarize,
  type Developer,
  type Project,
  type ProjectValue,
} from "@/lib/catalog";
import { compareHref } from "@/lib/compare";
import { fill, formatMillions, formatNumber } from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "./dictionaries";

type Locale = "ar" | "en";

// One icon per "what every project page shows" item, in the dictionary's order.
const PILLAR_ICONS = [MapTrifold, Coins, Buildings, Images, Phone];

const H2 = "font-display text-[34px] leading-[1.15] font-light tracking-[-0.02em] sm:text-[48px]";

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
      {/* ─── Hero: headline and search beside an arched window onto the lead project ─── */}
      <section className="relative">
        <Container className="grid min-h-[calc(100dvh-9rem)] grid-cols-1 items-center gap-12 pt-14 pb-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16 lg:pt-16">
          <div className="rise flex min-w-0 flex-col gap-7">
            <Eyebrow>{dict.hero.kicker}</Eyebrow>
            <h1 className="font-display text-[36px] leading-[1.2] font-light tracking-[-0.025em] text-ink sm:text-[58px] xl:text-[66px] ltr:leading-[1.02]">
              {dict.hero.line1}
              <br />
              <span className="font-normal text-brass">{dict.hero.line2}</span>
            </h1>
            <p className="max-w-[54ch] text-lg leading-relaxed text-body">{dict.hero.sub}</p>
            <div className="rise [animation-delay:120ms]">
              <SmartSearch locale={locale} labels={smartLabels(dict)} variant="hero" />
            </div>
          </div>

          {heroProject && (
            <Link
              href={`/${locale}/projects/${heroProject.slug}`}
              aria-label={heroProject.name[locale]}
              className="rise group relative mx-auto block aspect-[4/5] w-full max-w-[460px] text-white no-underline [animation-delay:200ms] hover:text-white max-lg:max-w-[380px] max-sm:aspect-[5/5]"
            >
              {/* Arched window: the shape of a mashrabiya opening, framing the project render. */}
              <span className="absolute inset-0 overflow-hidden rounded-t-[999px] rounded-b-3xl border border-line-strong shadow-[0_40px_80px_-40px_rgb(16_38_33/0.45)]">
                <ProjectArt
                  seed={`${heroProject.slug}-hero`}
                  kind={artKindFor(heroProject)}
                  tone="dusk"
                  className="absolute inset-0 size-full transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                />
                <span className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-deep/85 to-transparent" />
              </span>
              <span className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
                <span className="flex flex-col">
                  <span className="font-display text-2xl font-medium">{heroProject.name[locale]}</span>
                  <span className="text-sm text-on-dark">
                    {devBySlug.get(heroProject.developerSlug)?.name[locale]} · {dict.areas[heroProject.areaSlug]}
                  </span>
                </span>
                <span className="flex size-11 flex-none items-center justify-center rounded-full bg-white/15 backdrop-blur-md">
                  <ArrowIcon locale={locale} />
                </span>
              </span>
              {/* Concentric outline echoing the arch, offset behind it. */}
              <span aria-hidden="true" className="absolute -inset-3 -z-10 rounded-t-[999px] rounded-b-[2rem] border border-brass/30 max-sm:hidden" />
            </Link>
          )}
        </Container>
      </section>

      {/* ─── Catalogue in numbers ─────────────────────────────────────── */}
      <Container>
        <dl className="grid grid-cols-3 border-y border-line">
          {[
            [all.length, dict.home.statProjects],
            [developers.length, dict.home.statDevelopers],
            [insights.areas.length, dict.home.statAreas],
          ].map(([value, label], i) => (
            <div key={label} className={`flex flex-col-reverse gap-1 py-7 ps-1 sm:ps-8 ${i ? "border-s border-line" : ""}`}>
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="font-display text-4xl font-light text-ink sm:text-6xl">{value}</dd>
            </div>
          ))}
        </dl>
      </Container>

      {/* ─── Featured projects: a rail of tall posters ──────────────────── */}
      <section aria-labelledby="featured-title" className="reveal pt-24 sm:pt-32">
        <Container className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="featured-title" className={H2}>
            {dict.home.featuredTitle}
          </h2>
          <Link href={`/${locale}/projects`} className="group inline-flex min-h-11 items-center gap-2 font-medium no-underline">
            {dict.home.allProjects} <ArrowIcon locale={locale} />
          </Link>
        </Container>
        <div className="mx-auto mt-10 max-w-[1440px]">
          <ul className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-ps-4 px-4 pb-6 [scrollbar-width:thin] sm:scroll-ps-6 sm:px-6 xl:px-[max(1.5rem,calc((100%-77.5rem)/2+1.5rem))]">
            {featured.map((p, i) => (
              <li key={p.slug} className={`flex-none snap-start ${i === 0 ? "w-[86vw] sm:w-[560px]" : "w-[78vw] sm:w-[380px]"}`}>
                <Poster
                  project={p}
                  developer={devBySlug.get(p.developerSlug)}
                  value={insights.values[p.slug]}
                  locale={locale}
                  dict={dict}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Area index: each area in large type, its projects open on hover ─── */}
      <section id="areas" aria-labelledby="insights-title" className="reveal pt-24 sm:pt-32">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-8">
            <div className="flex flex-col gap-3">
              <Eyebrow>{dict.insights.eyebrow}</Eyebrow>
              <h2 id="insights-title" className={H2}>
                {dict.insights.title}
              </h2>
              <p className="max-w-[60ch] text-sm text-muted">{dict.insights.note}</p>
            </div>
            <ol>
              {insights.areas.map((a) => {
                const pct = insights.maxAvgPricePerM2 ? (a.avgPricePerM2 / insights.maxAvgPricePerM2) * 100 : 0;
                const inArea = all.filter((p) => p.areaSlug === a.area);
                return (
                  <li key={a.area} className="group border-t border-line py-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                      <Link
                        href={`/${locale}/projects?area=${a.area}`}
                        className="font-display text-[30px] leading-tight font-light text-ink no-underline transition-colors duration-300 group-hover:text-brass sm:text-[44px]"
                      >
                        {dict.areas[a.area]}
                      </Link>
                      <span className="flex items-baseline gap-2">
                        <span className="font-display text-2xl font-normal text-ink sm:text-3xl">{formatNumber(a.avgPricePerM2, locale)}</span>
                        <span className="text-xs text-muted">{dict.insights.perM2}</span>
                      </span>
                    </div>
                    {/* Relative price per m², as a bare line (no track behind it). */}
                    <span aria-hidden="true" className="mt-3 block h-[3px] rounded-full bg-brass-light/80" style={{ width: `${pct}%` }} />
                    <ul className="mt-4 flex flex-wrap items-center gap-2 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:translate-y-1 sm:opacity-60 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
                      <li className="text-[13px] text-muted">{fill(dict.insights.projects, { n: a.projects })}</li>
                      {inArea.map((p) => (
                        <li key={p.slug}>
                          <Link
                            href={`/${locale}/projects/${p.slug}`}
                            className="press inline-flex min-h-9 items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 text-[13px] text-ink no-underline hover:border-brass hover:text-ink"
                          >
                            {p.name[locale]}
                            <span className="text-muted">{formatMillions(summarize(p).startingPrice, locale)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </div>

          <aside aria-labelledby="best-title" className="lg:pt-24">
            <div className="flex flex-col gap-4 rounded-3xl bg-brand p-5 text-white sm:p-6 lg:sticky lg:top-28">
              <h3 id="best-title" className="font-display text-xl font-medium">
                {dict.insights.bestValue}
              </h3>
              <ol className="flex flex-col gap-3">
                {bestValue.map((p, i) => (
                  <BestValueRow key={p.slug} project={p} rank={i + 1} locale={locale} dict={dict} value={insights.values[p.slug]} />
                ))}
              </ol>
              <p className="text-xs text-on-dark-muted">{dict.insights.scoreHelp}</p>
            </div>
          </aside>
        </Container>
      </section>

      {/* ─── Map ───────────────────────────────────────────────────── */}
      <section aria-labelledby="map-title" className="reveal pt-24 sm:pt-32">
        <Container className="flex flex-wrap items-end justify-between gap-4 pb-8">
          <div className="flex flex-col gap-3">
            <h2 id="map-title" className={H2}>
              {dict.map.teaserTitle}
            </h2>
            <p className="max-w-xl text-muted">{dict.map.teaserText}</p>
          </div>
          <Link
            href={`/${locale}/map`}
            className="press group inline-flex min-h-12 items-center gap-2.5 rounded-full bg-brand ps-6 pe-2 font-medium text-white no-underline hover:bg-brand-2 hover:text-white"
          >
            {dict.map.open}
            <span className="flex size-8 items-center justify-center rounded-full bg-white/12">
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
            className="h-[min(560px,70dvh)] overflow-hidden rounded-3xl border border-line"
          />
        </Container>
      </section>

      {/* ─── What every project page shows: the heading stays while the items pass ─── */}
      <section aria-labelledby="pillars-title" className="reveal pt-24 sm:pt-32">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          <div>
            <h2 id="pillars-title" className={`${H2} lg:sticky lg:top-32`}>
              {dict.home.pillarsTitle}
            </h2>
          </div>
          <ol className="flex flex-col gap-5">
            {dict.home.pillars.map((pillar, i) => {
              const Icon = PILLAR_ICONS[i] ?? MapTrifold;
              const lead = i === 0;
              return (
                <li
                  key={pillar.title}
                  className={`reveal flex gap-5 rounded-3xl border border-line p-6 sm:gap-7 sm:p-8 ${lead ? "plan-grid bg-plan sm:min-h-64 sm:items-end" : "bg-surface"}`}
                >
                  <span aria-hidden="true" className="flex size-13 flex-none items-center justify-center rounded-2xl bg-brass-soft text-brass">
                    <Icon size={26} weight={lead ? "regular" : "light"} />
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <h3 className={`font-display font-medium text-ink ${lead ? "text-2xl sm:text-3xl" : "text-xl"}`}>{pillar.title}</h3>
                    <p className="max-w-[48ch] text-body">{pillar.text}</p>
                  </span>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      {/* ─── Compare: two projects face to face ─────────────────────── */}
      {first && second && (
        <section aria-labelledby="compare-title" className="reveal pt-24 sm:pt-32">
          <Container>
            <div className="plan-grid flex flex-col items-center gap-10 rounded-3xl border border-line bg-plan px-5 py-12 text-center sm:px-12 sm:py-16">
              <div className="flex flex-col items-center gap-4">
                <Eyebrow>{dict.home.compareEyebrow}</Eyebrow>
                <h2 id="compare-title" className={H2}>
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
      <section aria-labelledby="developers-title" className="reveal pt-24 pb-28 sm:pt-32">
        <Container className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="developers-title" className={H2}>
            {dict.home.developersTitle}
          </h2>
          <Link href={`/${locale}/developers`} className="group inline-flex min-h-11 items-center gap-2 font-medium no-underline">
            {dict.home.allDevelopers} <ArrowIcon locale={locale} />
          </Link>
        </Container>
        <div className="marquee mt-10 overflow-hidden border-y border-line py-6">
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

/** Tall project poster for the featured rail: the render fills the card, the figures sit underneath. */
function Poster({
  project,
  developer,
  value,
  locale,
  dict,
}: {
  project: Project;
  developer?: Developer;
  value?: ProjectValue;
  locale: Locale;
  dict: Dictionary;
}) {
  const s = summarize(project);
  const href = `/${locale}/projects/${project.slug}`;
  const kind = artKindFor(project);
  return (
    <article className="spotlight group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface">
      <Link href={href} className="relative block h-[420px] overflow-hidden text-white no-underline hover:text-white sm:h-[460px]">
        <ProjectArt
          seed={project.slug}
          kind={kind}
          tone={kind === "coastal" ? "day" : "dusk"}
          className="absolute inset-0 size-full transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
        />
        <span className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-deep/90 via-deep/30 to-transparent" />
        <span className="absolute top-4 start-4 rounded-full bg-deep/55 px-3 py-0.5 text-xs font-medium backdrop-blur">{dict.categories[project.categories[0]]}</span>
        {value && (
          <span className="absolute top-3.5 end-3.5">
            <ValueRing score={value.score} label={dict.insights.score} />
          </span>
        )}
        <span className="absolute inset-x-5 bottom-5 flex flex-col gap-1">
          <span className="font-display text-[34px] leading-tight font-medium">{project.name[locale]}</span>
          <span className="text-sm text-on-dark">
            {developer?.name[locale]} · {dict.areas[project.areaSlug]}
          </span>
          <span className="mt-2 font-display text-2xl text-brass-light">{formatMillions(s.startingPrice, locale)}</span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-5">
        {value && <span className={`text-[13px] font-medium ${value.vsAreaPct < -1 ? "text-brass" : "text-muted"}`}>{valueText(value, dict)}</span>}
        <dl className="grid grid-cols-3 gap-2">
          {[
            [dict.common.lowestDown, `${s.minDownPct}%`],
            [dict.projectPage.planYears, s.maxYears ? fill(dict.common.years, { n: s.maxYears }) : "-"],
            [dict.common.delivery, String(project.deliveryYear)],
          ].map(([label, v]) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-[15px] font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <CompareButton
          slug={project.slug}
          name={project.name}
          labels={{ add: dict.common.addToCompare, added: dict.common.inCompare }}
          className="mt-auto w-full rounded-full"
        />
      </div>
    </article>
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
  locale: Locale;
  dict: Dictionary;
  value?: ProjectValue;
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
        {value && <ValueRing score={value.score} label={dict.insights.score} />}
      </Link>
    </li>
  );
}

/** Two projects face to face: names on either side, each figure beside its project, the better one marked. */
function FaceOff({ locale, dict, a, b }: { locale: Locale; dict: Dictionary; a: Project; b: Project }) {
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
          <li key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,1fr)] items-center gap-3 rounded-2xl px-2 py-3 odd:bg-surface/70 sm:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)] sm:gap-6">
            {cell(va, better(na, nb, dir), "a")}
            <span className="text-center text-[13px] text-muted">{label}</span>
            {cell(vb, better(nb, na, dir), "b")}
          </li>
        ))}
      </ul>
    </div>
  );
}
