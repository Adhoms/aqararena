import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/i18n/config";
import { summarize, type Developer, type MarketInsights, type Project } from "@/lib/catalog";
import { fill } from "@/lib/format";
import type { MapPoint } from "./project-map";

/** Projects that have a location, as map pins with their text already in the visitor's language. */
export function toMapPoints(projects: Project[], developers: Developer[], insights: MarketInsights, dict: Dictionary, locale: Locale): MapPoint[] {
  const devName = new Map(developers.map((d) => [d.slug, d.name[locale]]));
  return projects
    .filter((p) => p.location)
    .map((p) => {
      const s = summarize(p);
      return {
        slug: p.slug,
        lat: p.location!.lat,
        lng: p.location!.lng,
        name: p.name[locale],
        developer: devName.get(p.developerSlug) ?? "",
        area: dict.areas[p.areaSlug],
        // Land area, not price: prices differ per unit, so the map shows size only.
        size: p.landFeddan ? fill(dict.projectPage.feddan, { n: p.landFeddan }) : undefined,
        down: `${dict.common.lowestDown} ${s.minDownPct}%`,
        delivery: p.deliveryYear,
        category: p.categories[0],
        score: insights.values[p.slug]?.score,
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
  };
}
