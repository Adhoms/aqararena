import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { mapLabels, toMapPoints } from "@/components/map/map-points";
import { ProjectMap } from "@/components/map/project-map";
import { ProjectCard } from "@/components/project-card";
import { ArrowIcon, CardGridSkeleton, Container } from "@/components/ui";
import { getMarketInsights, inEgp, listDevelopers, listProjects, sortProjects } from "@/lib/catalog";
import { compareHref } from "@/lib/compare";
import { fill, formatMillionsEgp, formatNumber } from "@/lib/format";
import { AREA_SLUGS, isAreaSlug } from "@/lib/property";
import { pageAlternates, SITE_URL } from "@/lib/site";
import { getDictionary, getLocale } from "../../dictionaries";

export async function generateStaticParams() {
  return AREA_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/areas/[slug]">): Promise<Metadata> {
  const [{ slug }, locale, dict] = await Promise.all([params, getLocale(), getDictionary()]);
  if (!isAreaSlug(slug)) return {};
  const area = dict.areas[slug];
  const title = fill(dict.areasPage.metaTitle, { area });
  const description = fill(dict.areasPage.metaDescription, { area });
  return { title, description, alternates: pageAlternates(locale, `/areas/${slug}`), openGraph: { title, description, url: `/${locale}/areas/${slug}` } };
}

export default function Page({ params }: PageProps<"/[lang]/areas/[slug]">) {
  return (
    <Suspense fallback={<Container className="pt-10 pb-24"><CardGridSkeleton label="" count={3} /></Container>}>
      <AreaContent params={params} />
    </Suspense>
  );
}

async function AreaContent({ params }: { params: PageProps<"/[lang]/areas/[slug]">["params"] }) {
  const { slug } = await params;
  if (!isAreaSlug(slug)) notFound();
  const [locale, dict, all, developers, insights] = await Promise.all([getLocale(), getDictionary(), listProjects(), listDevelopers(), getMarketInsights()]);
  const a = dict.areasPage;
  const area = dict.areas[slug];
  // Cheapest first, pounds before other currencies: prices in different currencies can't be ranked together.
  const projects = sortProjects(
    all.filter((p) => p.areaSlug === slug),
    "price",
  );
  const cheapestInEgp = projects.filter(inEgp).slice(0, 2);
  const stats = insights.areas.find((x) => x.area === slug);
  const devSlugs = new Set(projects.map((p) => p.developerSlug));
  const devBySlug = new Map(developers.map((d) => [d.slug, d]));
  const points = toMapPoints(projects, developers, insights, dict, locale);

  const figures: [string, string][] = [
    [a.projects, formatNumber(projects.length, locale)],
    [a.avgPerM2, stats ? `${formatNumber(stats.avgPricePerM2, locale)} ${dict.insights.perM2}` : "-"],
    [a.lowest, stats ? formatMillionsEgp(stats.lowestStartingPrice, locale) : "-"],
    [a.developers, formatNumber(devSlugs.size, locale)],
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: fill(a.listTitle, { area }),
          url: `${SITE_URL}/${locale}/areas/${slug}`,
          itemListElement: projects.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/${locale}/projects/${p.slug}`,
            name: p.name[locale],
          })),
        }}
      />
      <Container className="flex flex-col gap-10 pt-10 pb-24">
        <div className="flex flex-col gap-4">
          <nav aria-label="breadcrumb" className="flex gap-1.5 text-[13px] text-muted">
            <Link href={`/${locale}`}>{dict.nav.homeShort}</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${locale}/areas`}>{a.allAreas}</Link>
            <span aria-hidden="true">/</span>
            <span>{area}</span>
          </nav>
          <h1 className="font-display text-[42px] leading-tight font-light tracking-[-0.02em] sm:text-[58px]">{area}</h1>
          <p className="max-w-[62ch] text-lg text-body">{a.intro[slug]}</p>
        </div>

        <dl className="grid grid-cols-2 rounded-3xl border border-line bg-surface md:grid-cols-4">
          {figures.map(([label, value], i) => (
            <div key={label} className={`flex flex-col-reverse gap-1 p-5 sm:p-6 ${i % 2 ? "border-s border-line" : ""} ${i > 1 ? "max-md:border-t" : ""} ${i === 2 ? "md:border-s" : ""}`}>
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="font-display text-xl font-normal sm:text-2xl">{value}</dd>
            </div>
          ))}
        </dl>

        {points.length > 0 && (
          <section aria-labelledby="area-map" className="flex flex-col gap-4">
            <h2 id="area-map" className="font-display text-2xl font-light sm:text-3xl">
              {a.mapTitle}
            </h2>
            <ProjectMap mode="teaser" points={points} locale={locale} labels={mapLabels(dict)} className="h-[min(460px,60dvh)] overflow-hidden rounded-3xl border border-line" />
          </section>
        )}

        <section aria-labelledby="area-list" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="area-list" className="font-display text-2xl font-light sm:text-3xl">
              {fill(a.listTitle, { area })}
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {cheapestInEgp.length === 2 && (
                <Link
                  href={compareHref(locale, cheapestInEgp.map((p) => p.slug))}
                  className="press inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-5 text-ink no-underline hover:border-ink hover:text-ink"
                >
                  {a.compareTop}
                </Link>
              )}
              <Link
                href={`/${locale}/projects?area=${slug}`}
                className="press group inline-flex min-h-11 items-center gap-2 rounded-full bg-brand ps-5 pe-2 font-medium text-white no-underline hover:bg-brand-2 hover:text-white"
              >
                {a.filterLink}
                <span className="flex size-7 items-center justify-center rounded-full bg-white/12">
                  <ArrowIcon locale={locale} size={14} />
                </span>
              </Link>
            </div>
          </div>
          {projects.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-line-strong bg-surface p-10 text-center text-body">{a.empty}</p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
              {projects.map((project) => (
                <li key={project.slug} className="flex">
                  <div className="w-full">
                    <ProjectCard project={project} developer={devBySlug.get(project.developerSlug)} value={insights.values[project.slug]} locale={locale} dict={dict} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </>
  );
}
