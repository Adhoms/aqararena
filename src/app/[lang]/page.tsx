import Link from "next/link";
import { ValueRing, AreaPriceBars, valueText } from "@/components/insights";
import { mapLabels, toMapPoints } from "@/components/map/map-points";
import { ProjectMap } from "@/components/map/project-map";
import { artKindFor, ProjectArt } from "@/components/project-art";
import { ProjectCard } from "@/components/project-card";
import { smartLabels } from "@/components/smart-labels";
import { SmartSearch } from "@/components/smart-search";
import { Container, Eyebrow, SectionHeading } from "@/components/ui";
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

const arrow = (locale: string) => (locale === "ar" ? "←" : "→");

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
        <Container className="flex min-h-[calc(100dvh-6.5rem)] flex-col justify-center gap-9 pt-20 pb-16">
          <div className="rise flex max-w-5xl flex-col gap-6">
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="h-px w-10 bg-brass-light/70" />
              <Eyebrow onDark>{dict.hero.kicker}</Eyebrow>
            </span>
            <h1 className="font-display text-[46px] leading-[1.2] font-light tracking-[-0.02em] sm:text-[76px] lg:text-[92px] ltr:leading-[0.98]">
              {dict.hero.line1}
              <br />
              <span className="bg-linear-to-l from-brass-dark via-brass-light to-brass bg-clip-text text-transparent ltr:bg-linear-to-r">
                {dict.hero.line2}
              </span>
            </h1>
            <p className="max-w-[58ch] text-lg leading-relaxed text-on-dark sm:text-xl">{dict.hero.sub}</p>
          </div>
          <div className="rise max-w-4xl [animation-delay:120ms]">
            <SmartSearch locale={locale} labels={smartLabels(dict)} variant="hero" />
          </div>
          <dl className="rise flex flex-wrap gap-x-10 gap-y-4 [animation-delay:240ms]">
            {[
              [all.length, dict.home.statProjects],
              [developers.length, dict.home.statDevelopers],
              [insights.areas.length, dict.home.statAreas],
            ].map(([value, label], i) => (
              <div key={label} className={`flex flex-col-reverse gap-0.5 ${i ? "border-s border-white/12 ps-10" : ""}`}>
                <dt className="text-[13px] text-on-dark-muted">{label}</dt>
                <dd className="font-display text-4xl font-light text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* ─── Featured projects ─────────────────────────────────────── */}
      <Container className="reveal flex flex-col gap-7 pt-20">
        <SectionHeading
          eyebrow={dict.home.featuredEyebrow}
          title={dict.home.featuredTitle}
          action={
            <Link href={`/${locale}/projects`} className="inline-flex min-h-11 items-center font-medium no-underline">
              {dict.home.allProjects} {arrow(locale)}
            </Link>
          }
        />
        {/* Asymmetric: the lead project tall on one side, the next ones stacked beside it. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          {featured.map((p, i) => (
            <div key={p.slug} className={i === 0 ? "md:col-span-2 lg:col-span-1 lg:row-span-2" : ""}>
              <ProjectCard
                project={p}
                developer={devBySlug.get(p.developerSlug)}
                value={insights.values[p.slug]}
                locale={locale}
                dict={dict}
                size={i === 0 ? "feature" : "large"}
                badge="featured"
              />
            </div>
          ))}
        </div>
      </Container>

      {/* ─── Market insights ───────────────────────────────────────── */}
      <section id="areas" aria-labelledby="insights-title" className="pt-22">
        <Container className="reveal">
          <div className="grid grid-cols-1 gap-6 rounded-[28px] border border-line bg-surface p-5 sm:p-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <Eyebrow>{dict.insights.eyebrow}</Eyebrow>
                <h2 id="insights-title" className="font-display text-3xl font-normal tracking-tight sm:text-[34px]">
                  {dict.insights.title}
                </h2>
                <p className="text-sm text-muted">{dict.insights.note}</p>
              </div>
              <AreaPriceBars insights={insights} dict={dict} locale={locale} />
            </div>
            <div className="flex min-w-0 flex-col gap-4 rounded-3xl bg-brand p-5 text-white sm:p-6">
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
      <section aria-labelledby="map-title" className="reveal pt-22">
        <Container className="flex flex-wrap items-end justify-between gap-4 pb-6">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>{dict.map.teaserEyebrow}</Eyebrow>
            <h2 id="map-title" className="font-display text-3xl font-normal tracking-tight sm:text-[34px]">
              {dict.map.teaserTitle}
            </h2>
            <p className="max-w-xl text-muted">{dict.map.teaserText}</p>
          </div>
          <Link
            href={`/${locale}/map`}
            className="press inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-medium text-white no-underline hover:bg-brand-2 hover:text-white"
          >
            {dict.map.open} {arrow(locale)}
          </Link>
        </Container>
        <Container>
          <ProjectMap
            mode="teaser"
            points={toMapPoints(all, developers, insights, dict, locale)}
            locale={locale}
            labels={mapLabels(dict)}
            className="h-[480px] overflow-hidden rounded-[28px] border border-line"
          />
        </Container>
      </section>

      {/* ─── What every project page shows ─────────────────────────── */}
      <Container className="reveal flex flex-col gap-7 pt-22">
        <SectionHeading eyebrow={dict.home.pillarsEyebrow} title={dict.home.pillarsTitle} />
        <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-[22px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {dict.home.pillars.map((pillar, i) => (
            <li key={pillar.title} className="flex flex-col gap-3 bg-surface px-5.5 py-6.5 transition-colors hover:bg-ground">
              <span className="font-display text-3xl font-light text-brass">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-lg font-medium">{pillar.title}</span>
              <span className="text-sm text-muted">{pillar.text}</span>
            </li>
          ))}
        </ol>
      </Container>

      {/* ─── Compare teaser ────────────────────────────────────────── */}
      {first && second && (
        <Container className="reveal pt-22">
          <div className="relative isolate flex flex-wrap items-center gap-10 overflow-hidden rounded-[28px] bg-brand p-8 text-white sm:p-12">
            <ProjectArt seed="compare-band" kind="residential" tone="night" className="absolute inset-0 -z-10 size-full opacity-35" />
            <div className="flex flex-[1_1_360px] flex-col gap-4">
              <Eyebrow onDark>{dict.home.compareEyebrow}</Eyebrow>
              <h2 className="font-display text-[34px] leading-[1.4] font-light sm:text-[40px] ltr:leading-[1.15]">
                {dict.home.compareTitleLine1}
                <br />
                {dict.home.compareTitleLine2}
              </h2>
              <p className="text-on-dark">{dict.home.compareText}</p>
              <Link
                href={compareHref(locale, [first.slug, second.slug])}
                className="press inline-flex min-h-13 items-center self-start rounded-full bg-brass-light px-7 font-semibold text-brand no-underline hover:bg-[#d8bc86] hover:text-brand"
              >
                {dict.home.compareCta}
              </Link>
            </div>
            <CompareTeaser locale={locale} dict={dict} a={first} b={second} />
          </div>
        </Container>
      )}

      {/* ─── Developers ────────────────────────────────────────────── */}
      <Container className="reveal flex flex-col gap-7 pt-22 pb-24">
        <SectionHeading
          eyebrow={dict.home.developersEyebrow}
          title={dict.home.developersTitle}
          action={
            <Link href={`/${locale}/developers`} className="inline-flex min-h-11 items-center font-medium no-underline">
              {dict.home.allDevelopers} {arrow(locale)}
            </Link>
          }
        />
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] gap-4">
          {developers.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/${locale}/developers/${d.slug}`}
                className="spotlight flex h-full flex-col items-center gap-2.5 rounded-[18px] border border-line bg-surface px-4 py-6 text-center text-ink no-underline transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:text-ink"
              >
                <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-brand font-display text-xl text-brass-light">
                  {d.name.en.replace("Developer ", "").charAt(0)}
                </span>
                <span className="font-semibold">{d.name[locale]}</span>
                <span className="text-[13px] text-muted">{fill(dict.common.projectsCount, { n: devCounts[d.slug] ?? 0 })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
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
        className="flex items-center gap-3.5 rounded-2xl bg-brand-2 p-3 text-white no-underline transition-colors hover:bg-brand-3 hover:text-white"
      >
        <span className="w-5 flex-none text-center font-display text-lg text-on-dark-muted">{rank}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display font-medium">{project.name[locale]}</span>
          <span className="truncate text-xs text-on-dark-muted">
            {dict.areas[project.areaSlug]} · {formatMillions(summarize(project).startingPrice, locale)}
            {value ? ` · ${valueText(value, dict)}` : ""}
          </span>
        </span>
        {value && <ValueRing score={value.score} label={dict.insights.score} onDark />}
      </Link>
    </li>
  );
}

function CompareTeaser({ locale, dict, a, b }: { locale: "ar" | "en"; dict: Dictionary; a: Project; b: Project }) {
  const sa = summarize(a);
  const sb = summarize(b);
  const rows: [string, string, string, number, number, "low" | "high"][] = [
    [dict.common.startingFrom, formatMillions(sa.startingPrice, locale), formatMillions(sb.startingPrice, locale), sa.startingPrice, sb.startingPrice, "low"],
    [dict.common.lowestDown, `${sa.minDownPct}%`, `${sb.minDownPct}%`, sa.minDownPct, sb.minDownPct, "low"],
    [dict.comparePage.rows.maxYears, fill(dict.common.years, { n: sa.maxYears }), fill(dict.common.years, { n: sb.maxYears }), sa.maxYears, sb.maxYears, "high"],
    [dict.common.delivery, String(a.deliveryYear), String(b.deliveryYear), a.deliveryYear, b.deliveryYear, "low"],
  ];
  const better = (x: number, y: number, dir: "low" | "high") => (x === y ? false : dir === "low" ? x < y : x > y);

  return (
    <table className="flex-[1_1_440px] overflow-hidden rounded-[20px] bg-brand-2/90 text-sm backdrop-blur">
      <thead>
        <tr>
          <td className="px-4 py-3.5" />
          <th scope="col" className="px-4 py-3.5 text-start font-semibold">
            {a.name[locale]}
          </th>
          <th scope="col" className="px-4 py-3.5 text-start font-semibold">
            {b.name[locale]}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, va, vb, na, nb, dir]) => (
          <tr key={label} className="border-t border-brand-3">
            <th scope="row" className="px-4 py-3 text-start font-normal text-on-dark-muted">
              {label}
            </th>
            <td className={`px-4 py-3 ${better(na, nb, dir) ? "font-semibold text-brass-light" : ""}`}>{va}</td>
            <td className={`px-4 py-3 ${better(nb, na, dir) ? "font-semibold text-brass-light" : ""}`}>{vb}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
