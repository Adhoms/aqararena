import Link from "next/link";
import { Suspense } from "react";
import { isAreaSlug, isPropertyCategory } from "@/lib/property";
import { getDictionary, getLocale, type Dictionary } from "../dictionaries";

// Placeholder until Phase 1: shows the filters the visitor picked.
export default async function SearchPage({ searchParams }: PageProps<"/[lang]/search">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold">{dict.searchPage.title}</h1>
      <Suspense fallback={<div className="h-24 rounded-2xl bg-placeholder" />}>
        <ChosenFilters searchParams={searchParams} dict={dict} locale={locale} />
      </Suspense>
      <p className="rounded-2xl border border-line bg-surface p-5 text-muted">{dict.searchPage.comingSoon}</p>
      <Link href={`/${locale}`} className="self-start font-semibold">
        {dict.searchPage.back}
      </Link>
    </section>
  );
}

async function ChosenFilters({
  searchParams,
  dict,
  locale,
}: {
  searchParams: PageProps<"/[lang]/search">["searchParams"];
  dict: Dictionary;
  locale: string;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const money = (v: string | undefined) => {
    const n = Number(v);
    return v && Number.isFinite(n) && n > 0
      ? // Western digits in both languages, matching how prices are written across the site.
        `${n.toLocaleString(locale === "ar" ? "ar-EG-u-nu-latn" : "en-EG")} ${dict.currency}`
      : null;
  };

  const area = first(params.area);
  const category = first(params.category);
  const down = money(first(params.down));
  const monthly = money(first(params.monthly));

  const chips = [
    isAreaSlug(area) && `${dict.search.area}: ${dict.areas[area]}`,
    isPropertyCategory(category) && `${dict.search.category}: ${dict.categories[category]}`,
    down && `${dict.search.downPayment}: ${down}`,
    monthly && `${dict.search.monthly}: ${monthly}`,
  ].filter((c): c is string => Boolean(c));

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted">{dict.searchPage.yourFilters}</h2>
      <ul className="flex flex-wrap gap-2">
        {chips.length === 0 ? (
          <li className="text-muted">{dict.searchPage.none}</li>
        ) : (
          chips.map((chip) => (
            <li key={chip} className="rounded-full bg-brand-soft px-3 py-1 text-sm text-brand">
              {chip}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
