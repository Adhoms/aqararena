import type { Locale } from "@/i18n/config";
import { EGYPT } from "./egypt-map-data";

// The site backdrop: a map of Egypt drawn like an architect's plan sheet — survey grid with
// degree marks, hatched land inside a layered border, the Nile and Suez Canal, cities as
// survey points, north arrow, scale bar and title block. Decorative only (aria-hidden).

const CITY_NAMES: Record<string, { ar: string; en: string; main?: boolean }> = {
  cairo: { ar: "القاهرة", en: "CAIRO", main: true },
  alexandria: { ar: "الإسكندرية", en: "ALEXANDRIA" },
  newCapital: { ar: "العاصمة الإدارية", en: "NEW CAPITAL", main: true },
  northCoast: { ar: "الساحل الشمالي", en: "NORTH COAST" },
  sokhna: { ar: "العين السخنة", en: "AIN SOKHNA" },
  hurghada: { ar: "الغردقة", en: "HURGHADA" },
  sharm: { ar: "شرم الشيخ", en: "SHARM EL SHEIKH" },
  luxor: { ar: "الأقصر", en: "LUXOR" },
  aswan: { ar: "أسوان", en: "ASWAN" },
};

// Labels that would overlap a neighbour go to the other side of their point.
const LABEL_LEFT = new Set(["alexandria", "northCoast", "cairo", "luxor", "aswan"]);

const INK = "#cdae74";
const NILE = "#5fb3aa";

export function EgyptBlueprint({ locale, className = "" }: { locale: Locale; className?: string }) {
  const [[x0, y0], [x1, y1]] = EGYPT.bbox;
  return (
    <svg viewBox="0 0 1000 1000" className={className} aria-hidden="true" fill="none">
      <defs>
        <pattern id="bp-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="9" stroke={INK} strokeWidth="0.6" strokeOpacity="0.16" />
        </pattern>
        <clipPath id="bp-land">
          <path d={EGYPT.border} />
        </clipPath>
      </defs>

      {/* Survey grid with degree marks */}
      <g stroke={INK} strokeOpacity="0.14" strokeWidth="0.8" strokeDasharray="2 6">
        {EGYPT.grat.map((g) => (
          <line key={`${g.kind}${g.v}`} x1={g.a[0]} y1={g.a[1]} x2={g.b[0]} y2={g.b[1]} />
        ))}
      </g>
      <g fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="var(--font-alexandria), sans-serif" letterSpacing="1.5">
        {EGYPT.grat.map((g) =>
          g.kind === "lon" ? (
            <text key={`t${g.kind}${g.v}`} x={g.a[0]} y={g.a[1] + 18} textAnchor="middle">
              {g.v}°E
            </text>
          ) : (
            <text key={`t${g.kind}${g.v}`} x={g.a[0] - 8} y={g.a[1] + 4} textAnchor="end">
              {g.v}°N
            </text>
          ),
        )}
      </g>

      {/* Land: hatch inside, then layered border like plan contours, drawn on once */}
      <rect x="0" y="0" width="1000" height="1000" fill="url(#bp-hatch)" clipPath="url(#bp-land)" />
      <path d={EGYPT.border} stroke={INK} strokeOpacity="0.05" strokeWidth="22" strokeLinejoin="round" />
      <path d={EGYPT.border} stroke={INK} strokeOpacity="0.1" strokeWidth="9" strokeLinejoin="round" />
      <path d={EGYPT.border} stroke={INK} strokeOpacity="0.85" strokeWidth="1.6" strokeLinejoin="round" pathLength={1} className="bp-draw" />

      {/* Bounding dimension lines along the top and the right */}
      <g stroke={INK} strokeOpacity="0.35" strokeWidth="0.8">
        <line x1={x0} y1={y0 - 34} x2={x1} y2={y0 - 34} />
        <line x1={x0} y1={y0 - 42} x2={x0} y2={y0 - 26} />
        <line x1={x1} y1={y0 - 42} x2={x1} y2={y0 - 26} />
        <line x1={x1 + 34} y1={y0} x2={x1 + 34} y2={y1} />
        <line x1={x1 + 26} y1={y0} x2={x1 + 42} y2={y0} />
        <line x1={x1 + 26} y1={y1} x2={x1 + 42} y2={y1} />
      </g>
      <g fill={INK} fillOpacity="0.55" fontSize="11" fontFamily="var(--font-alexandria), sans-serif" letterSpacing="2">
        <text x={(x0 + x1) / 2} y={y0 - 40} textAnchor="middle">
          ≈ 1,240 KM
        </text>
        <text x={x1 + 48} y={(y0 + y1) / 2} transform={`rotate(90 ${x1 + 48} ${(y0 + y1) / 2})`} textAnchor="middle">
          ≈ 1,080 KM
        </text>
      </g>

      {/* The Nile, its delta, and the Suez Canal */}
      <g stroke={NILE} strokeLinecap="round" strokeLinejoin="round">
        <path d={EGYPT.nile} strokeOpacity="0.15" strokeWidth="8" />
        <path d={EGYPT.nile} strokeOpacity="0.8" strokeWidth="2" pathLength={1} className="bp-draw bp-draw-late" />
        <path d={EGYPT.rosetta} strokeOpacity="0.7" strokeWidth="1.4" />
        <path d={EGYPT.damietta} strokeOpacity="0.7" strokeWidth="1.4" />
        <path d={EGYPT.canal} strokeOpacity="0.7" strokeWidth="1.4" strokeDasharray="4 4" />
      </g>

      {/* Cities as survey points */}
      <g fontFamily="var(--font-alexandria), var(--font-plex-arabic), sans-serif" fontSize={locale === "ar" ? 14 : 11} letterSpacing={locale === "ar" ? 0 : 2}>
        {EGYPT.cities.map(({ id, xy: [x, y] }) => {
          const city = CITY_NAMES[id];
          const left = LABEL_LEFT.has(id);
          return (
            <g key={id} className="bp-point">
              <circle cx={x} cy={y} r={city.main ? 7 : 5} stroke={INK} strokeOpacity="0.9" strokeWidth="1" />
              <circle cx={x} cy={y} r="1.6" fill={INK} />
              <line x1={x - 12} y1={y} x2={x + 12} y2={y} stroke={INK} strokeOpacity="0.5" strokeWidth="0.7" />
              <line x1={x} y1={y - 12} x2={x} y2={y + 12} stroke={INK} strokeOpacity="0.5" strokeWidth="0.7" />
              <text x={left ? x - 16 : x + 16} y={y + 4} textAnchor={left ? "end" : "start"} fill={INK} fillOpacity={city.main ? 0.95 : 0.7}>
                {city[locale]}
              </text>
            </g>
          );
        })}
      </g>

      {/* North arrow */}
      <g transform="translate(900 110)" stroke={INK} strokeOpacity="0.7" strokeWidth="1">
        <circle r="26" />
        <path d="M0 -22 L7 8 L0 3 L-7 8 Z" fill={INK} fillOpacity="0.6" />
        <text y="-32" textAnchor="middle" fill={INK} stroke="none" fontSize="12" fontFamily="var(--font-alexandria), sans-serif">
          N
        </text>
      </g>

      {/* Scale bar */}
      <g transform="translate(90 930)" stroke={INK} strokeOpacity="0.7" strokeWidth="1">
        <line x1="0" y1="0" x2={EGYPT.scale200} y2="0" />
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={EGYPT.scale200 * f} y1="-6" x2={EGYPT.scale200 * f} y2="6" />
        ))}
        <rect x="0" y="-3" width={EGYPT.scale200 / 2} height="6" fill={INK} fillOpacity="0.4" stroke="none" />
        <text x={EGYPT.scale200 + 10} y="4" fill={INK} stroke="none" fontSize="11" letterSpacing="2" fontFamily="var(--font-alexandria), sans-serif">
          200 KM
        </text>
      </g>

      {/* Title block */}
      <g transform="translate(640 900)" fontFamily="var(--font-alexandria), sans-serif" fill={INK}>
        <rect width="300" height="64" stroke={INK} strokeOpacity="0.5" fill="none" />
        <line x1="0" y1="26" x2="300" y2="26" stroke={INK} strokeOpacity="0.35" />
        <line x1="200" y1="26" x2="200" y2="64" stroke={INK} strokeOpacity="0.35" />
        <text x="12" y="18" fontSize="12" letterSpacing="3" fillOpacity="0.9">
          AQARARENA · EGYPT
        </text>
        <text x="12" y="49" fontSize="10" letterSpacing="2" fillOpacity="0.6">
          MASTER PLAN · 1:6,000,000
        </text>
        <text x="212" y="49" fontSize="10" letterSpacing="2" fillOpacity="0.6">
          SHEET 01
        </text>
      </g>
    </svg>
  );
}
