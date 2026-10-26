/**
 * The AqarArena mark: a pointed arch (a mashrabiya opening) whose peak reads as the "A",
 * a second arch inside it like the tiers of an arena, standing on a ground line (the land).
 * Drawn in currentColor so it takes the tile's accent in both light and dark mode.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M9.5 32V19.5C9.5 13.6 13.6 9.4 20 6.5C26.4 9.4 30.5 13.6 30.5 19.5V32" strokeWidth="2.6" />
      <path d="M15 32V22.6C15 19.3 17 16.9 20 15.2C23 16.9 25 19.3 25 22.6V32" strokeWidth="2.1" />
      <path d="M6.5 32.5H33.5" strokeWidth="2.6" />
    </svg>
  );
}

/** The AqarArena logo: the arch mark on an evergreen tile + wordmark. The wordmark stays left-to-right in Arabic too. */
export function BrandMark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`flex size-9 items-center justify-center rounded-[10px] text-brass-light shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] ${
          onDark ? "bg-brand-2" : "bg-brand"
        }`}
      >
        <LogoMark className="size-7" />
      </span>
      <span dir="ltr" className="font-display text-lg font-medium tracking-tight sm:text-[21px]">
        Aqar<span className={onDark ? "text-brass-light" : "text-brass"}>Arena</span>
      </span>
    </span>
  );
}
