"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { compareHref } from "@/lib/compare";
import { useCompareList } from "./store";

/** Header button: opens the comparison with the visitor's current list and shows how many are in it. */
export function CompareLink({ locale, label, countLabel }: { locale: Locale; label: string; countLabel: string }) {
  const { items } = useCompareList();
  return (
    <Link
      href={compareHref(locale, items.map((i) => i.slug))}
      aria-label={`${label} — ${countLabel.replace("{n}", String(items.length))}`}
      className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-3 text-sm font-medium text-white no-underline hover:bg-brand-2 hover:text-white sm:px-4"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="sm:hidden">
        <rect x="3" y="5" width="7" height="14" rx="1.5" />
        <rect x="14" y="5" width="7" height="14" rx="1.5" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
      <span className="inline-flex size-5.5 items-center justify-center rounded-full bg-brass-light text-xs font-semibold text-brand">
        {items.length}
      </span>
    </Link>
  );
}
