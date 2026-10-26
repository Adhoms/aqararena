import { LOGO_DOTS } from "./logo-mark-data";

/**
 * The AqarArena mark: Egypt drawn in dots from its real border. Dots grow near the Nile and the
 * coasts, where the projects are, and shrink in the desert; Cairo is the solid dot.
 * Drawn in currentColor so it takes the tile's accent in light and dark mode.
 * Data: scripts/build-logo-mark.mjs.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true" className={className}>
      {LOGO_DOTS.map(([cx, cy, r, o]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fillOpacity={o < 1 ? o : undefined} />
      ))}
    </svg>
  );
}

/** The AqarArena logo: the Egypt mark on an evergreen tile + wordmark. The wordmark stays left-to-right in Arabic too. */
export function BrandMark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`flex size-10 items-center justify-center rounded-[11px] text-brass-light shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] ${
          onDark ? "bg-brand-2" : "bg-brand"
        }`}
      >
        <LogoMark className="size-9" />
      </span>
      <span dir="ltr" className="font-display text-lg font-medium tracking-tight sm:text-[21px]">
        Aqar<span className={onDark ? "text-brass-light" : "text-brass"}>Arena</span>
      </span>
    </span>
  );
}
