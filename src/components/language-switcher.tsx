"use client";

import type { MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";

type Props = { target: Locale; label: string; ariaLabel: string };

/** Swaps /ar ↔ /en on the current page and remembers the choice. */
export function LanguageSwitcher({ target, label, ariaLabel }: Props) {
  const pathname = usePathname();
  const segments = pathname.split("/");
  segments[1] = target;
  const href = segments.join("/");

  function switchLanguage(event: MouseEvent<HTMLAnchorElement>) {
    document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
    // Keep the current filters (?area=…) and anchor when changing language.
    event.preventDefault();
    window.location.assign(href + window.location.search + window.location.hash);
  }

  // A plain <a>: switching languages swaps the root layout (lang/dir), so a full load is expected.
  return (
    <a
      href={href}
      hrefLang={target}
      lang={target}
      aria-label={ariaLabel}
      onClick={switchLanguage}
      className="inline-flex min-h-11 items-center rounded-full border border-line px-3 font-display sm:px-4 text-sm text-ink no-underline hover:border-ink hover:text-ink"
    >
      {label}
    </a>
  );
}
