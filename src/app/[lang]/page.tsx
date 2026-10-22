import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { Container, Eyebrow, PhotoPlaceholder, SectionHeading } from "@/components/ui";
import {
  countProjectsByArea,
  countProjectsByDeveloper,
  getFeaturedProjects,
  listDevelopers,
  summarize,
  totalProjects,
} from "@/lib/catalog";
import { compareHref } from "@/lib/compare";
import { fill, formatMillions } from "@/lib/format";
import { AREA_SLUGS, PROPERTY_CATEGORIES } from "@/lib/property";
import { getDictionary, getLocale } from "./dictionaries";

const fieldLabel = "flex flex-col px-3.5 py-1.5 text-xs font-medium text-muted";
const fieldInput = "min-h-8 border-0 bg-transparent p-0 text-base text-ink outline-none";
const arrow = (locale: string) => (locale === "ar" ? "←" : "→");

export default async function HomePage() {
  const [locale, dict, featured, developers, areaCounts, devCounts, projectCount] = await Promise.all([
    getLocale(),
    getDictionary(),
    getFeaturedProjects(),
    listDevelopers(),
    countProjectsByArea(),
    countProjectsByDeveloper(),
    totalProjects(),
  ]);
  const devBySlug = new Map(developers.map((d) => [d.slug, d]));
  const [first, second] = featured;

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="bg-brand text-white">
        <Container className="flex flex-wrap items-center gap-12 pt-18 pb-20">
          <div className="flex flex-[1_1_520px] flex-col gap-6">
            <Eyebrow onDark>{dict.home.eyebrow}</Eyebrow>
            <h1 className="font-display text-[40px] leading-[1.3] font-light tracking-tight sm:text-[54px] ltr:leading-[1.15]">
              {dict.home.titleLine1}
              <br />
              {dict.home.titleLine2}
            </h1>
            <p className="max-w-xl text-lg text-on-dark">{dict.home.subtitle}</p>

            <form
              action={`/${locale}/projects`}
              method="get"
              role="search"
              className="flex flex-wrap items-stretch gap-2 rounded-[18px] bg-surface p-2.5 text-ink"
            >
              <label className={`${fieldLabel} flex-[2_1_220px]`}>
                {dict.home.searchLabel}
                <input type="search" name="q" placeholder={dict.home.searchPlaceholder} className={fieldInput} />
              </label>
              <label className={`${fieldLabel} flex-[1_1_150px] border-line sm:border-s`}>
                {dict.home.area}
                <select name="area" defaultValue="" className={fieldInput}>
                  <option value="">{dict.home.anyArea}</option>
                  {AREA_SLUGS.map((slug) => (
                    <option key={slug} value={slug}>
                      {dict.areas[slug]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${fieldLabel} flex-[1_1_150px] border-line sm:border-s`}>
                {dict.home.type}
                <select name="category" defaultValue="" className={fieldInput}>
                  <option value="">{dict.home.anyType}</option>
                  {PROPERTY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {dict.categories[c]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex min-h-14 flex-[0_0_auto] items-center justify-center gap-2 rounded-xl bg-brand px-6.5 font-medium text-white hover:bg-brand-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                {dict.home.explore}
              </button>
            </form>

            <dl className="flex flex-wrap gap-x-10 gap-y-3 pt-2">
              {[
                [developers.length, dict.home.statDevelopers],
                [projectCount, dict.home.statProjects],
                [Object.keys(areaCounts).length, dict.home.statAreas],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="text-[13px] text-on-dark-muted">{label}</dt>
                  <dd className="font-display text-[28px]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid flex-[1_1_420px] grid-cols-2 gap-3" aria-hidden="true">
            <PhotoPlaceholder label={dict.home.heroPhoto} tone="dark" className="col-span-2 h-75 rounded-[20px]" />
            <PhotoPlaceholder label={dict.home.heroPlan} tone="dark" className="h-42 rounded-[20px] bg-[#1c3d40]" />
            <PhotoPlaceholder label={dict.home.heroInterior} tone="dark" className="h-42 rounded-[20px] bg-[#2c5154]" />
          </div>
        </Container>
      </section>

      {/* ─── What every project page shows ─────────────────────── */}
      <Container className="flex flex-col gap-7 pt-18">
        <SectionHeading eyebrow={dict.home.pillarsEyebrow} title={dict.home.pillarsTitle} />
        <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {dict.home.pillars.map((pillar, i) => (
            <li key={pillar.title} className="flex flex-col gap-3 bg-surface px-5.5 py-6.5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brass-soft font-display font-medium text-brass">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-lg font-medium">{pillar.title}</span>
              <span className="text-sm text-muted">{pillar.text}</span>
            </li>
          ))}
        </ol>
      </Container>

      {/* ─── Featured projects ─────────────────────────────────── */}
      <Container className="flex flex-col gap-7 pt-16">
        <SectionHeading
          eyebrow={dict.home.featuredEyebrow}
          title={dict.home.featuredTitle}
          action={
            <Link href={`/${locale}/projects`} className="inline-flex min-h-11 items-center font-medium no-underline">
              {dict.home.allProjects} {arrow(locale)}
            </Link>
          }
        />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-6">
          {featured.map((p) => (
            <ProjectCard key={p.slug} project={p} developer={devBySlug.get(p.developerSlug)} locale={locale} dict={dict} size="large" badge="featured" />
          ))}
        </div>
      </Container>

      {/* ─── Areas ─────────────────────────────────────────────── */}
      <Container className="flex flex-col gap-7 pt-18">
        <section id="areas" aria-labelledby="areas-title" className="flex flex-col gap-7">
          <SectionHeading eyebrow={dict.home.areasEyebrow} title={<span id="areas-title">{dict.home.areasTitle}</span>} />
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4">
            {AREA_SLUGS.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/${locale}/projects?area=${slug}`}
                  className="flex h-50 items-end overflow-hidden rounded-[20px] bg-photo text-ink no-underline hover:text-ink hover:ring-2 hover:ring-brass"
                >
                  <span className="m-3 flex flex-col rounded-[14px] bg-surface px-4 py-2.5 leading-snug">
                    <span className="font-display text-[17px] font-medium">{dict.areas[slug]}</span>
                    <span className="text-[13px] text-muted">{fill(dict.common.projectsCount, { n: areaCounts[slug] ?? 0 })}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Container>

      {/* ─── Compare teaser ────────────────────────────────────── */}
      {first && second && (
        <Container className="pt-18">
          <div className="flex flex-wrap items-center gap-10 rounded-[28px] bg-brand p-8 text-white sm:p-12">
            <div className="flex flex-[1_1_360px] flex-col gap-4">
              <Eyebrow onDark>{dict.home.compareEyebrow}</Eyebrow>
              <h2 className="font-display text-[34px] leading-[1.4] font-light sm:text-[38px] ltr:leading-[1.2]">
                {dict.home.compareTitleLine1}
                <br />
                {dict.home.compareTitleLine2}
              </h2>
              <p className="text-on-dark">{dict.home.compareText}</p>
              <Link
                href={compareHref(locale, [first.slug, second.slug])}
                className="inline-flex min-h-13 items-center self-start rounded-full bg-brass-light px-7 font-semibold text-brand no-underline hover:bg-[#d8bc86] hover:text-brand"
              >
                {dict.home.compareCta}
              </Link>
            </div>
            <CompareTeaser locale={locale} dict={dict} a={first} b={second} />
          </div>
        </Container>
      )}

      {/* ─── Developers ────────────────────────────────────────── */}
      <Container className="flex flex-col gap-7 pt-18 pb-22">
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
                className="flex h-full flex-col items-center gap-2.5 rounded-[18px] border border-line bg-surface px-4 py-6 text-center text-ink no-underline hover:border-ink hover:text-ink"
              >
                <span aria-hidden="true" className="flex h-14 w-21 items-center justify-center rounded-[10px] bg-divider text-xs text-muted">
                  {dict.common.logo}
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

function CompareTeaser({
  locale,
  dict,
  a,
  b,
}: {
  locale: "ar" | "en";
  dict: Awaited<ReturnType<typeof getDictionary>>;
  a: Parameters<typeof summarize>[0];
  b: Parameters<typeof summarize>[0];
}) {
  const sa = summarize(a);
  const sb = summarize(b);
  // Highlights the better value on each line, like the full comparison does.
  const rows: [string, string, string, number, number, "low" | "high"][] = [
    [dict.common.startingFrom, formatMillions(sa.startingPrice, locale), formatMillions(sb.startingPrice, locale), sa.startingPrice, sb.startingPrice, "low"],
    [dict.common.lowestDown, `${sa.minDownPct}%`, `${sb.minDownPct}%`, sa.minDownPct, sb.minDownPct, "low"],
    [dict.comparePage.rows.maxYears, fill(dict.common.years, { n: sa.maxYears }), fill(dict.common.years, { n: sb.maxYears }), sa.maxYears, sb.maxYears, "high"],
    [dict.common.delivery, String(a.deliveryYear), String(b.deliveryYear), a.deliveryYear, b.deliveryYear, "low"],
  ];
  const better = (x: number, y: number, dir: "low" | "high") => (x === y ? false : dir === "low" ? x < y : x > y);

  return (
    <table className="flex-[1_1_440px] overflow-hidden rounded-[20px] bg-brand-2 text-sm">
      <thead>
        <tr className="text-start">
          <td className="px-4 py-3.5" />
          <th scope="col" className="px-4 py-3.5 text-start font-semibold">{a.name[locale]}</th>
          <th scope="col" className="px-4 py-3.5 text-start font-semibold">{b.name[locale]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, va, vb, na, nb, dir]) => (
          <tr key={label} className="border-t border-brand-3">
            <th scope="row" className="px-4 py-3 text-start font-normal text-on-dark-muted">{label}</th>
            <td className={`px-4 py-3 ${better(na, nb, dir) ? "font-semibold text-brass-light" : ""}`}>{va}</td>
            <td className={`px-4 py-3 ${better(nb, na, dir) ? "font-semibold text-brass-light" : ""}`}>{vb}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
