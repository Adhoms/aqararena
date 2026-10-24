import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/i18n/config";
import type { MarketInsights, ProjectValue } from "@/lib/catalog";
import { fill, formatNumber } from "@/lib/format";
import type { AreaSlug } from "@/lib/property";

/** How the project's price per m² compares with its area, in words. */
export function valueText(value: ProjectValue, dict: Dictionary) {
  if (Math.abs(value.vsAreaPct) < 2 || value.areaCount < 2) return dict.insights.average;
  return value.vsAreaPct < 0
    ? fill(dict.insights.cheaper, { n: Math.abs(value.vsAreaPct) })
    : fill(dict.insights.pricier, { n: value.vsAreaPct });
}

/** Score in a small ring, for cards. */
// `onDark` is kept for callers; the ring now always uses the dark style.
export function ValueRing({ score, label, size = 44 }: { score: number; label: string; size?: number; onDark?: boolean }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <span
      role="img"
      aria-label={`${label}: ${score} / 10`}
      className="relative inline-flex flex-none items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="rgba(4,16,15,0.7)" stroke="rgba(255,255,255,0.14)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="#cdae74" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(score / 10) * c} ${c}`} />
      </svg>
      <span aria-hidden="true" className={`relative font-display text-[13px] font-medium text-white`}>
        {score.toFixed(1)}
      </span>
    </span>
  );
}

/** Horizontal bars of average price per m² by area. */
export function AreaPriceBars({ insights, dict, locale, linkAreas = true }: { insights: MarketInsights; dict: Dictionary; locale: Locale; linkAreas?: boolean }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {insights.areas.map((a) => {
        const pct = insights.maxAvgPricePerM2 ? (a.avgPricePerM2 / insights.maxAvgPricePerM2) * 100 : 0;
        const name = dict.areas[a.area as AreaSlug];
        return (
          <li key={a.area} className="grid grid-cols-[minmax(84px,160px)_minmax(0,1fr)] items-center gap-3 sm:gap-4">
            {linkAreas ? (
              <Link href={`/${locale}/projects?area=${a.area}`} className="text-sm font-medium text-ink no-underline hover:text-brand">
                {name}
                <span className="block text-xs font-normal text-muted">{fill(dict.insights.projects, { n: a.projects })}</span>
              </Link>
            ) : (
              <span className="text-sm font-medium">{name}</span>
            )}
            <div className="flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-divider">
                <div className="reveal-bar h-full rounded-full bg-linear-to-l from-brass-light to-brand-3" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-24 flex-none text-end font-display text-[13px] font-medium sm:w-28 sm:text-sm">
                {formatNumber(a.avgPricePerM2, locale)} <span className="text-xs font-normal text-muted">{dict.insights.perM2}</span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** This project's price per m² against its area's average, plus its score. */
export function ProjectVsMarket({
  avgPricePerM2,
  areaAvg,
  value,
  area,
  dict,
  locale,
}: {
  avgPricePerM2: number;
  areaAvg: number;
  value: ProjectValue;
  area: AreaSlug;
  dict: Dictionary;
  locale: Locale;
}) {
  const max = Math.max(avgPricePerM2, areaAvg) * 1.1;
  const rows: [string, number, string][] = [
    [dict.insights.thisProject, avgPricePerM2, "bg-brass-light"],
    [fill(dict.insights.areaAvg, { area: dict.areas[area] }), areaAvg, "bg-brand-3"],
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <ValueRing score={value.score} label={dict.insights.score} size={64} />
        <div className="flex flex-col">
          <span className="font-display text-lg font-medium">
            {dict.insights.score}: {value.score.toFixed(1)} <span className="text-sm font-normal text-muted">{dict.insights.scoreOutOf}</span>
          </span>
          <span className="text-sm text-body">{valueText(value, dict)}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map(([label, v, tone]) => (
          <li key={label} className="flex flex-col gap-1.5">
            <span className="flex justify-between text-sm">
              <span className="text-body">{label}</span>
              <b className="font-display font-medium">
                {formatNumber(v, locale)} <span className="text-xs font-normal text-muted">{dict.insights.perM2}</span>
              </b>
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-divider">
              <span className={`reveal-bar block h-full rounded-full ${tone}`} style={{ width: `${(v / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
      {value.areaCount > 1 && (
        <p className="text-sm text-body">{fill(dict.insights.rank, { rank: value.areaRank, count: value.areaCount, area: dict.areas[area] })}</p>
      )}
      <p className="text-xs text-muted">{dict.insights.scoreHelp}</p>
    </div>
  );
}

