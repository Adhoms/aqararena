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
      className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-surface px-4 text-ink no-underline hover:border-ink"
    >
      {label}
    </a>
  );
}
