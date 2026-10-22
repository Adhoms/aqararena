import type { NextRequest } from "next/server";
import { getMarketInsights, listDevelopers, searchProjects, summarize } from "@/lib/catalog";
import { paramsFromSearch, readFilters } from "@/lib/catalog/read-filters";

// Live results for the smart search bar. The bar understands the sentence in the browser
// and sends the filters it found (same parameters as the projects page):
//   GET /api/search?type=APARTMENT&area=new-cairo&down=10
// Returns the number of matches and the four best-value ones.

export type SearchHit = {
  slug: string;
  name: { ar: string; en: string };
  developer: { ar: string; en: string };
  area: string;
  startingPrice: number;
  minDownPct: number;
  deliveryYear: number;
  score?: number;
};

export type SearchResponse = { count: number; hits: SearchHit[] };

export async function GET(request: NextRequest) {
  const filters = readFilters(paramsFromSearch(request.nextUrl.searchParams));
  const [projects, developers, insights] = await Promise.all([searchProjects(filters), listDevelopers(), getMarketInsights()]);
  const devName = new Map(developers.map((d) => [d.slug, d.name]));

  const top = [...projects]
    .sort((a, b) => (insights.values[b.slug]?.score ?? 0) - (insights.values[a.slug]?.score ?? 0))
    .slice(0, 4);

  const body: SearchResponse = {
    count: projects.length,
    hits: top.map((p) => {
      const s = summarize(p);
      return {
        slug: p.slug,
        name: p.name,
        developer: devName.get(p.developerSlug) ?? { ar: "", en: "" },
        area: p.areaSlug,
        startingPrice: s.startingPrice,
        minDownPct: s.minDownPct,
        deliveryYear: p.deliveryYear,
        score: insights.values[p.slug]?.score,
      };
    }),
  };
  return Response.json(body);
}
