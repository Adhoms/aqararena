/** The AqarArena logo: evergreen "A" tile + wordmark. The wordmark stays left-to-right in Arabic too. */
export function BrandMark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`flex size-9 items-center justify-center rounded-lg font-display text-lg font-medium ${
          onDark ? "bg-brand-2 text-brass-light" : "bg-brand text-brass-light"
        }`}
      >
        A
      </span>
      <span dir="ltr" className="font-display text-lg font-medium tracking-tight sm:text-[21px]">
        Aqar<span className={onDark ? "text-brass-light" : "text-brass"}>Arena</span>
      </span>
    </span>
  );
}
