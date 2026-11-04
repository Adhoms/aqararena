import type { Locale } from "@/i18n/config";
import type { Developer } from "@/lib/catalog";

/**
 * A developer's uploaded logo on a white tile, or their initials in brass while there is no logo.
 * `className` sets the tile's size and corners.
 */
export function DeveloperLogo({
  developer,
  locale,
  className = "size-16 rounded-2xl",
  onDark = false,
}: {
  developer: Pick<Developer, "name" | "logoUrl">;
  locale: Locale;
  className?: string;
  onDark?: boolean;
}) {
  if (developer.logoUrl) {
    return (
      <span className={`flex flex-none items-center justify-center bg-white p-2 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded logo, any format */}
        <img src={developer.logoUrl} alt={developer.name[locale]} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
      </span>
    );
  }
  const initials =
    developer.name.en
      .split(/\s+/)
      .filter((w) => /^[A-Za-z0-9]/.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || developer.name[locale].slice(0, 1);
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center font-display text-xl tracking-[0.12em] ${
        onDark ? "bg-brand-2 text-brass-light" : "bg-brand text-brass-light"
      } ${className}`}
    >
      {initials}
    </span>
  );
}
