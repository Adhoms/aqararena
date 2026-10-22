"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { compareHref } from "@/lib/compare";
import { useCompareList } from "./store";

type Props = { locale: Locale; labels: { tray: string; compareNow: string; clear: string } };

/** Bottom bar listing the projects picked for comparison. Hidden on the comparison page itself. */
export function CompareTray({ locale, labels }: Props) {
  const { items, clear } = useCompareList();
  const pathname = usePathname();
  if (items.length === 0 || pathname.endsWith("/compare")) return null;

  return (
    <>
      {/* Keeps the footer from sitting under the fixed bar. */}
      <div aria-hidden="true" className="h-20 print:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-310 flex-wrap items-center gap-2.5 px-4 py-3 sm:px-6">
          <span className="font-semibold">{labels.tray.replace("{n}", String(items.length))}</span>
          <ul className="hidden flex-wrap gap-2 sm:flex">
            {items.map((item) => (
              <li key={item.slug} className="rounded-full bg-brass-soft px-3.5 py-1 text-[13px] text-brass-dark">
                {item.name[locale]}
              </li>
            ))}
          </ul>
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={clear}
              className="min-h-11 rounded-full px-4 text-sm text-link hover:text-brand"
            >
              {labels.clear}
            </button>
            <Link
              href={compareHref(locale, items.map((i) => i.slug))}
              className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 font-medium text-white no-underline hover:bg-brand-2 hover:text-white"
            >
              {labels.compareNow}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
