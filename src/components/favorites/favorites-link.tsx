"use client";

import { Heart } from "@phosphor-icons/react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { useFavorites } from "./store";

/** Header button (desktop): opens the favorites page and shows how many are saved. */
export function FavoritesLink({ locale, label, className = "" }: { locale: Locale; label: string; className?: string }) {
  const { slugs } = useFavorites();
  return (
    <Link
      href={`/${locale}/favorites`}
      aria-label={`${label}: ${slugs.length}`}
      title={label}
      className={`press relative inline-flex size-11 items-center justify-center rounded-full border border-line text-ink no-underline hover:border-line-strong hover:bg-ink/5 hover:text-ink ${className}`}
    >
      <Heart size={20} weight={slugs.length ? "fill" : "regular"} aria-hidden="true" className={slugs.length ? "text-brass" : undefined} />
      {slugs.length > 0 && (
        <span className="absolute -top-1 -end-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brass-light px-1 text-[11px] font-semibold text-deep">
          {slugs.length}
        </span>
      )}
    </Link>
  );
}
