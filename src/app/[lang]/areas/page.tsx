import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon, Container } from "@/components/ui";
import { getMarketInsights } from "@/lib/catalog";
import { fill, formatMillions, formatNumber } from "@/lib/format";
import { AREA_SLUGS } from "@/lib/property";
import { pageAlternates } from "@/lib/site";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: dict.areasPage.title, description: dict.areasPage.subtitle, alternates: pageAlternates(locale, "/areas") };
}

/** Every area as a large-type row: name, short description, its figures, and a link to its page. */
export default async function AreasPage() {
  const [locale, dict, insights] = await Promise.all([getLocale(), getDictionary(), getMarketInsights()]);
  const a = dict.areasPage;
  const byArea = new Map(insights.areas.map((x) => [x.area, x]));

  return (
    <Container className="flex flex-col gap-10 pt-10 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-light tracking-[-0.015em] sm:text-[46px]">{a.title}</h1>
        <p className="max-w-[60ch] text-muted">{a.subtitle}</p>
      </div>
      <ol>
        {AREA_SLUGS.map((slug) => {
          const stats = byArea.get(slug);
          return (
            <li key={slug} className="border-t border-line">
              <Link
                href={`/${locale}/areas/${slug}`}
                className="group grid gap-x-10 gap-y-3 py-7 text-ink no-underline hover:text-ink md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] md:items-center"
              >
                <span className="font-display text-[30px] leading-tight font-light transition-colors group-hover:text-brass sm:text-[40px]">
                  {dict.areas[slug]}
                </span>
                <span className="max-w-[56ch] text-sm text-body">{a.intro[slug]}</span>
                <span className="flex items-center gap-6">
                  {stats ? (
                    <span className="flex flex-col text-end">
                      <span className="font-display text-xl">
                        {formatNumber(stats.avgPricePerM2, locale)} <span className="text-xs text-muted">{dict.insights.perM2}</span>
                      </span>
                      <span className="text-[13px] text-muted">
                        {fill(dict.insights.projects, { n: stats.projects })} · {dict.common.startingFrom} {formatMillions(stats.lowestStartingPrice, locale, "EGP")}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[13px] text-muted">{a.empty}</span>
                  )}
                  <span className="flex size-10 flex-none items-center justify-center rounded-full border border-line-strong transition-colors group-hover:border-brass group-hover:bg-brass-soft">
                    <ArrowIcon locale={locale} size={16} />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Container>
  );
}
