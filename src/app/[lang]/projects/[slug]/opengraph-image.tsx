import { ImageResponse } from "next/og";
import { currencyOf, getDeveloper, getProject, summarize } from "@/lib/catalog";
import type { Currency } from "@/lib/property";
import { OG, OG_SIZE, OgBrand, OgDotField } from "@/lib/og";
import en from "../../dictionaries/en.json";

// The share image for a project: name, developer, area and the numbers that matter.
export const alt = "Project on AqarArena";
export const size = OG_SIZE;
export const contentType = "image/png";

/** "EGP 4.85M" or "$1.20M", like the English cards. */
const millions = (v: number, currency: Currency) => {
  const m = (v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2);
  return currency === "USD" ? `$${m}M` : `EGP ${m}M`;
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return new Response("Not found", { status: 404 });
  const developer = await getDeveloper(project.developerSlug);
  const s = summarize(project);
  const stats: [string, string][] = [
    ["From", millions(s.startingPrice, currencyOf(project))],
    ["Down payment", `${s.minDownPct}%`],
    ["Installments", s.maxYears ? `${s.maxYears} years` : "Cash"],
    ["Delivery", String(project.deliveryYear)],
  ];

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 64, background: OG.deep, position: "relative" }}>
        <OgDotField />
        <OgBrand />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 26, color: OG.brass, letterSpacing: 2 }}>
            {[developer?.name.en, en.areas[project.areaSlug]].filter(Boolean).join("  ·  ").toUpperCase()}
          </div>
          <div style={{ fontSize: project.name.en.length > 22 ? 64 : 80, lineHeight: 1.02, color: OG.white, maxWidth: 1000 }}>{project.name.en}</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {stats.map(([label, value]) => (
            <div
              key={label}
              style={{ display: "flex", flexDirection: "column", gap: 6, padding: "18px 26px", borderRadius: 22, background: "rgba(29,74,66,0.85)", border: "1px solid rgba(226,168,74,0.35)" }}
            >
              <span style={{ fontSize: 20, color: OG.muted }}>{label}</span>
              <span style={{ fontSize: 38, color: OG.white }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
