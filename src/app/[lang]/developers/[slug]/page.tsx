import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GroupFilter } from "@/components/area-filter";
import { ContactStack } from "@/components/contact-list";
import { Container, Eyebrow, PhotoPlaceholder } from "@/components/ui";
import { getDeveloper, getProjectsByDeveloper, listDevelopers, summarize } from "@/lib/catalog";
import { fill, formatMoney } from "@/lib/format";
import { AREA_SLUGS } from "@/lib/property";
import { getDictionary, getLocale } from "../../dictionaries";

export async function generateStaticParams() {
  return (await listDevelopers()).map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/developers/[slug]">): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const developer = await getDeveloper(slug);
  return developer ? { title: developer.name[locale], description: developer.about[locale] } : {};
}

const badgeTone = {
  DELIVERED: "bg-surface text-ink",
  READY: "bg-surface text-ink",
  UNDER_CONSTRUCTION: "bg-brand text-white",
  LAUNCH: "bg-brass-light text-brand",
} as const;

// The slug comes from the URL, so the content streams in behind a skeleton and navigation stays instant.
export default function Page({ params }: PageProps<"/[lang]/developers/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DeveloperContent params={params} />
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

async function DeveloperContent({ params }: { params: PageProps<"/[lang]/developers/[slug]">["params"] }) {
  const { slug } = await params;
  const [locale, dict, developer, projects] = await Promise.all([getLocale(), getDictionary(), getDeveloper(slug), getProjectsByDeveloper(slug)]);
  if (!developer) notFound();
  const d = dict.developerPage;

  const delivered = projects.filter((p) => p.status === "DELIVERED" || p.status === "READY").length;
  const building = projects.filter((p) => p.status === "UNDER_CONSTRUCTION" || p.status === "LAUNCH").length;
  const areas = AREA_SLUGS.filter((a) => projects.some((p) => p.areaSlug === a));

  return (
    <>
      <section className="bg-brand text-white">
        <Container className="flex flex-col gap-8 pt-12 pb-14">
          <nav aria-label="breadcrumb" className="flex gap-1.5 text-[13px] text-on-dark-muted">
            <Link href={`/${locale}`} className="text-on-dark hover:text-white">
              {dict.nav.homeShort}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${locale}/developers`} className="text-on-dark hover:text-white">
              {dict.nav.developers}
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{developer.name[locale]}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-7">
            <span aria-hidden="true" className="flex size-35 items-center justify-center rounded-[28px] bg-surface text-[13px] text-muted">
              {dict.common.logo}
            </span>
            <div className="flex flex-[1_1_420px] flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-4xl leading-tight font-light sm:text-[46px]">{developer.name[locale]}</h1>
                {developer.verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brass-light px-3 py-0.5 text-[13px] font-medium text-brand">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    {d.verified}
                  </span>
                )}
              </div>
              {developer.foundedYear && <span className="text-[17px] text-on-dark">{fill(d.founded, { year: developer.foundedYear })}</span>}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-brand-3 sm:grid-cols-4">
            {[
              [d.onPlatform, projects.length],
              [d.delivered, delivered],
              [d.underConstruction, building],
              [d.areas, areas.length],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col-reverse bg-brand-2 px-5.5 py-5">
                <dt className="text-[13px] text-on-dark-muted">{label}</dt>
                <dd className="font-display text-[32px]">{value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <Container className="flex flex-col gap-16 pt-14 pb-24">
        <section className="flex flex-wrap items-start gap-8">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <h2 className="font-display text-3xl font-normal">{d.about}</h2>
            <p className="max-w-3xl text-[17px] text-body">{developer.about[locale]}</p>
          </div>
          <aside aria-label={d.officialNumbers} className="flex flex-[1_1_340px] flex-col gap-2.5 rounded-[22px] border border-line bg-surface p-6">
            <h2 className="font-display text-xl font-medium">{d.officialNumbers}</h2>
            <p className="text-[13px] text-muted">{d.noMiddleman}</p>
            <ContactStack developer={developer} dict={dict} locale={locale} />
          </aside>
        </section>

        <section aria-labelledby="portfolio-title" className="flex flex-col gap-5.5">
          <div className="flex flex-col gap-1">
            <Eyebrow>{d.portfolioEyebrow}</Eyebrow>
            <h2 id="portfolio-title" className="font-display text-3xl font-normal">
              {fill(d.portfolioTitle, { dev: developer.name[locale] })}
            </h2>
          </div>
          <GroupFilter
            label={dict.projectsPage.area}
            allLabel={d.allAreas}
            countLabel={dict.common.projectsCount}
            groups={areas.map((a) => ({ id: a, label: dict.areas[a] }))}
            items={projects.map((p) => {
              const done = p.status === "DELIVERED" || p.status === "READY";
              return {
                key: p.slug,
                group: p.areaSlug,
                node: (
                  <Link
                    href={`/${locale}/projects/${p.slug}`}
                    className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-surface text-ink no-underline hover:border-ink hover:text-ink"
                  >
                    <PhotoPlaceholder label={dict.common.photo} className="h-52">
                      <span className={`absolute top-3.5 end-3.5 rounded-full px-3 py-0.5 text-xs font-medium ${badgeTone[p.status]}`}>
                        {dict.status[p.status]}
                      </span>
                    </PhotoPlaceholder>
                    <span className="flex flex-col gap-1.5 px-5 py-4.5">
                      <span className="font-display text-xl font-medium">{p.name[locale]}</span>
                      <span className="text-sm text-muted">
                        {dict.areas[p.areaSlug]} · {p.categories.map((c) => dict.categories[c]).join(" · ")}
                      </span>
                      <span className="mt-1 flex justify-between border-t border-divider pt-2.5 text-sm">
                        <span className="text-muted">{done ? fill(d.deliveredIn, { year: p.deliveryYear }) : dict.common.startingFrom}</span>
                        {!done && <span className="font-semibold">{formatMoney(summarize(p).startingPrice, locale)}</span>}
                      </span>
                    </span>
                  </Link>
                ),
              };
            })}
          />
        </section>
      </Container>
    </>
  );
}
