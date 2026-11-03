import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { listDevelopers, listProjects } from "@/lib/catalog";
import { AREA_SLUGS } from "@/lib/property";
import { SITE_URL } from "@/lib/site";

/** Every public page in both languages, each entry pointing at its other-language twin. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, developers] = await Promise.all([listProjects(), listDevelopers()]);
  const entry = (path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number][] =>
    locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: lastModified ? new Date(lastModified) : undefined,
      changeFrequency: "weekly",
      priority,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
    }));

  return [
    ...entry("", 1),
    ...entry("/projects", 0.9),
    ...entry("/new-launches", 0.8),
    ...entry("/map", 0.7),
    ...entry("/developers", 0.7),
    ...entry("/for-developers", 0.5),
    ...entry("/compare", 0.5),
    ...AREA_SLUGS.flatMap((area) => entry(`/areas/${area}`, 0.8)),
    ...projects.flatMap((p) => entry(`/projects/${p.slug}`, 0.9, p.pricesUpdated)),
    ...developers.flatMap((d) => entry(`/developers/${d.slug}`, 0.6)),
  ];
}
