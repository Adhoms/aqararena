import type { Metadata } from "next";
import { pageAlternates } from "@/lib/site";
import Link from "next/link";
import { ArrowIcon, Container, SectionHeading } from "@/components/ui";
import { countProjectsByDeveloper, listDevelopers } from "@/lib/catalog";
import { fill } from "@/lib/format";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: dict.meta.developersTitle, alternates: pageAlternates(locale, "/developers") };
}

export default async function DevelopersPage() {
  const [locale, dict, developers, counts] = await Promise.all([getLocale(), getDictionary(), listDevelopers(), countProjectsByDeveloper()]);

  return (
    <Container className="flex flex-col gap-8 pt-10 pb-24">
      <div className="flex flex-col gap-2">
        <SectionHeading as="h1" eyebrow={dict.home.developersEyebrow} title={dict.developersPage.title} />
        <p className="text-muted">{dict.developersPage.subtitle}</p>
      </div>
      <Link
        href={`/${locale}/for-developers`}
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-brass/40 bg-brass-soft px-6 py-4 text-ink no-underline hover:border-brass hover:text-ink"
      >
        <span className="font-medium">{dict.forDevelopersPage.title}</span>
        <span className="inline-flex items-center gap-1.5 text-sm text-brass-dark">
          {dict.forDevelopersPage.ctaRequest} <ArrowIcon locale={locale} size={16} />
        </span>
      </Link>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
        {developers.map((d) => (
          <li key={d.slug}>
            <Link
              href={`/${locale}/developers/${d.slug}`}
              className="flex h-full items-center gap-4 rounded-3xl border border-line bg-surface p-5 text-ink no-underline hover:border-ink hover:text-ink"
            >
              <span aria-hidden="true" className="flex size-16 flex-none items-center justify-center rounded-2xl bg-divider text-xs text-muted">
                {dict.common.logo}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-display text-[17px] font-medium">{d.name[locale]}</span>
                <span className="text-sm text-muted">{fill(dict.common.projectsCount, { n: counts[d.slug] ?? 0 })}</span>
                {d.verified && <span className="text-xs font-semibold text-brass">{dict.developerPage.verified}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
