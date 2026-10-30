import type { Metadata } from "next";
import { pageAlternates } from "@/lib/site";
import { mapLabels, toMapPoints } from "@/components/map/map-points";
import { ProjectMap } from "@/components/map/project-map";
import { getMarketInsights, listDevelopers, listProjects } from "@/lib/catalog";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: dict.map.title, alternates: pageAlternates(locale, "/map") };
}

export default async function MapPage() {
  const [locale, dict, projects, developers, insights] = await Promise.all([
    getLocale(),
    getDictionary(),
    listProjects(),
    listDevelopers(),
    getMarketInsights(),
  ]);

  return (
    <section aria-labelledby="map-title" className="flex flex-col">
      <div className="border-b border-line bg-surface px-4 py-4 sm:px-6">
        <h1 id="map-title" className="font-display text-2xl font-normal">
          {dict.map.title}
        </h1>
        <p className="text-sm text-muted">{dict.map.subtitle}</p>
      </div>
      <ProjectMap
        mode="explore"
        points={toMapPoints(projects, developers, insights, dict, locale)}
        locale={locale}
        labels={mapLabels(dict)}
        className="h-[calc(100vh-190px)] min-h-[560px]"
      />
    </section>
  );
}
