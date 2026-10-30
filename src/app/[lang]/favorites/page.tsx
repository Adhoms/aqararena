import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FavoritesSync } from "@/components/favorites/favorites-sync";
import { SaveSharedList } from "@/components/favorites/save-shared";
import { ProjectCard } from "@/components/project-card";
import { ShareButton } from "@/components/share-button";
import { ArrowIcon, CardGridSkeleton, Container } from "@/components/ui";
import { getMarketInsights, getProjectsBySlugs, listDevelopers } from "@/lib/catalog";
import { compareHref, MAX_COMPARE } from "@/lib/compare";
import { fill } from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "../dictionaries";

type Locale = "ar" | "en";
type Search = Record<string, string | string[] | undefined>;

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  // A personal list: useful to share, not useful in search results.
  return { title: dict.favorites.title, robots: { index: false, follow: true } };
}

export default async function FavoritesPage({ searchParams }: PageProps<"/[lang]/favorites">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const f = dict.favorites;
  return (
    <Container className="flex flex-col gap-7 pt-10 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-light tracking-[-0.015em] sm:text-[46px]">{f.title}</h1>
        <p className="max-w-[60ch] text-muted">{f.subtitle}</p>
      </div>
      <Suspense fallback={<CardGridSkeleton label={f.title} count={3} />}>
        <FavoritesBody searchParams={searchParams} locale={locale} dict={dict} />
      </Suspense>
    </Container>
  );
}

async function FavoritesBody({ searchParams, locale, dict }: { searchParams: Promise<Search>; locale: Locale; dict: Dictionary }) {
  const params = await searchParams;
  const raw = Array.isArray(params.p) ? params.p[0] : params.p;
  const slugs = [...new Set((raw ?? "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 100);
  const shared = params.shared === "1";
  const [projects, developers, insights] = await Promise.all([getProjectsBySlugs(slugs), listDevelopers(), getMarketInsights()]);
  const devBySlug = new Map(developers.map((d) => [d.slug, d]));
  const f = dict.favorites;

  return (
    <>
      <FavoritesSync shared={shared} />
      {shared && projects.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-brass/40 bg-brass-soft p-5">
          <span className="font-display text-lg font-medium">{f.sharedTitle}</span>
          <SaveSharedList slugs={projects.map((p) => p.slug)} labels={{ save: f.saveShared, saved: f.savedShared }} />
        </div>
      )}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <p className="max-w-[46ch] text-lg text-body">{f.empty}</p>
          <Link
            href={`/${locale}/projects`}
            className="press group inline-flex min-h-12 items-center gap-2.5 rounded-full bg-brand ps-6 pe-2 font-medium text-white no-underline hover:bg-brand-2 hover:text-white"
          >
            {f.browse}
            <span className="flex size-8 items-center justify-center rounded-full bg-white/12">
              <ArrowIcon locale={locale} size={16} />
            </span>
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold" aria-live="polite">
              {fill(f.count, { n: projects.length })}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {projects.length > 1 && (
                <Link
                  href={compareHref(locale, projects.slice(0, MAX_COMPARE).map((p) => p.slug))}
                  className="press inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-5 text-ink no-underline hover:border-ink hover:text-ink"
                >
                  {f.compareAll}
                </Link>
              )}
              {!shared && (
                <ShareButton
                  label={f.share}
                  copiedLabel={f.copied}
                  title={f.title}
                  addQuery="shared=1"
                  className="press inline-flex min-h-11 items-center rounded-full bg-brand px-5 font-medium text-white hover:bg-brand-2"
                />
              )}
            </div>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
            {projects.map((project) => (
              <li key={project.slug} className="flex">
                <div className="w-full">
                  <ProjectCard project={project} developer={devBySlug.get(project.developerSlug)} value={insights.values[project.slug]} locale={locale} dict={dict} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
