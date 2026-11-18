import type { Locale } from "@/i18n/config";
import type { PricePoint } from "@/lib/catalog/types";
import { fill, formatMoney } from "@/lib/format";
import { changePct } from "@/lib/price-points";
import type { Currency } from "@/lib/property";

type Labels = { title: string; sub: string; up: string; down: string; same: string; perM2: string; chart: string };

/**
 * The project's average price per m² at each change, as a stepped line: a price holds until the
 * developer changes it. Needs at least two points; time always runs left to right.
 */
export function PriceHistory({
  points,
  locale,
  currency,
  labels,
}: {
  points: PricePoint[];
  locale: Locale;
  currency: Currency;
  labels: Labels;
}) {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const dateLocale = locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
  const monthYear = (iso: string) => new Intl.DateTimeFormat(dateLocale, { month: "long", year: "numeric" }).format(new Date(iso));
  const fullDate = (iso: string) => new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  const perM2 = (n: number) => fill(labels.perM2, { amount: formatMoney(n, locale, currency) });

  const pct = changePct(points);
  const change = fill(pct > 0 ? labels.up : pct < 0 ? labels.down : labels.same, { pct: Math.abs(pct), date: monthYear(first.date) });

  // Positions in percent of the plot: x by date, y by price with a little room above and below.
  // The last change stops short of the edge, so today's price shows as a level and not only a jump.
  const LAST_X = 90;
  const t0 = Date.parse(first.date);
  const span = Math.max(1, Date.parse(last.date) - t0);
  const values = points.map((p) => p.perM2);
  const low = Math.min(...values);
  const range = Math.max(...values) - low;
  const at = points.map((p) => ({
    x: ((Date.parse(p.date) - t0) / span) * LAST_X,
    y: range ? 88 - ((p.perM2 - low) / range) * 76 : 50,
  }));
  const line = `${at.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `H${p.x}V${p.y}`)).join("")}H100`;

  return (
    <section aria-label={labels.title} className="grid gap-6 rounded-3xl border border-line bg-surface p-6 sm:p-9 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-display text-2xl font-medium">{labels.title}</h3>
          <p className="text-sm text-muted">{labels.sub}</p>
        </div>
        <span className="font-display text-[30px] leading-tight font-light">{perM2(last.perM2)}</span>
        <span className="self-start rounded-full bg-brass-soft px-3.5 py-1 text-sm font-semibold text-brass-dark">{change}</span>
      </div>

      <div dir="ltr" className="flex flex-col gap-2">
        <div className="relative h-44" role="img" aria-label={fill(labels.chart, { from: monthYear(first.date), to: monthYear(last.date) })}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
            <path d={`${line}V100H0Z`} className="fill-brass-soft" />
            <path d={line} fill="none" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="stroke-brass" />
          </svg>
          {at.map((p, i) => (
            <span
              key={points[i].date}
              title={`${fullDate(points[i].date)} · ${perM2(points[i].perM2)}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              className="absolute size-3 -translate-1/2 rounded-full border-2 border-surface bg-brass"
            />
          ))}
        </div>
        <div className="relative h-4 text-xs text-muted">
          <span>{monthYear(first.date)}</span>
          <span style={{ left: `${LAST_X}%` }} className="absolute -translate-x-1/2 whitespace-nowrap">
            {monthYear(last.date)}
          </span>
        </div>
        <ol className="sr-only">
          {points.map((p) => (
            <li key={p.date}>
              {fullDate(p.date)}: {perM2(p.perM2)}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
