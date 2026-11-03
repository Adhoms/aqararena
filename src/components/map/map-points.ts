import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/i18n/config";
import { summarize, type Developer, type MarketInsights, type Project } from "@/lib/catalog";
import { fill, formatMillions } from "@/lib/format";
import { normalizeSearch } from "@/lib/search-text";
import type { MapPoint } from "./project-map";

/** Projects that have a location, as map pins with their text already in the visitor's language. */
export function toMapPoints(projects: Project[], developers: Developer[], insights: MarketInsights, dict: Dictionary, locale: Locale): MapPoint[] {
  const dev = new Map(developers.map((d) => [d.slug, d]));
  return projects
    .filter((p) => p.location)
    .map((p) => {
      const s = summarize(p);
      const d = dev.get(p.developerSlug);
      return {
        slug: p.slug,
        lat: p.location!.lat,
        lng: p.location!.lng,
        name: p.name[locale],
        developer: d?.name[locale] ?? "",
        developerSlug: p.developerSlug,
        area: dict.areas[p.areaSlug],
        district: p.district[locale] || undefined,
        // Land area, not price, on the pin: prices differ per unit. The card shows the starting price.
        size: p.landFeddan ? fill(dict.projectPage.feddan, { n: p.landFeddan }) : undefined,
        price: Number.isFinite(s.startingPrice) ? `${dict.common.startingFrom} ${formatMillions(s.startingPrice, locale)}` : undefined,
        priceValue: Number.isFinite(s.startingPrice) ? s.startingPrice : undefined,
        down: `${dict.common.lowestDown} ${s.minDownPct}%`,
        delivery: p.deliveryYear,
        category: p.categories[0],
        status: p.status,
        score: insights.values[p.slug]?.score,
        // Both languages, so a visitor can type either name.
        search: normalizeSearch(
          [p.name.ar, p.name.en, d?.name.ar, d?.name.en, dict.areas[p.areaSlug], p.district.ar, p.district.en, p.slug].filter(Boolean).join(" "),
        ),
      };
    });
}

export function mapLabels(dict: Dictionary) {
  return {
    label: dict.map.label,
    loading: dict.map.loading,
    showAll: dict.map.showAll,
    cluster: dict.map.cluster,
    inView: dict.map.inView,
    all: dict.map.all,
    viewProject: dict.common.viewProject,
    categories: dict.categories,
    statuses: dict.status,
    search: dict.map.search,
    searchResults: dict.map.searchResults,
    searchNone: dict.map.searchNone,
    searchClear: dict.map.searchClear,
    clusterCount: dict.map.clusterCount,
    clusterCountTwo: dict.map.clusterCountTwo,
    clusterCountFew: dict.map.clusterCountFew,
    clusterFrom: dict.map.clusterFrom,
  };
}
