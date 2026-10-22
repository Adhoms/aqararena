"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { Text } from "@/lib/catalog/types";
import { compareHref } from "@/lib/compare";
import { useCompareList, type CompareItem } from "./store";

/** Holds the "differences only" switch; rows that are the same in every column hide when it's on. */
export function CompareShell({ toolbar, label, children }: { toolbar: ReactNode; label: string; children: ReactNode }) {
  const [diffOnly, setDiffOnly] = useState(false);
  return (
    <div data-diff={diffOnly ? "on" : "off"} className="group/cmp flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2.5 print:hidden">
        <button
          type="button"
          aria-pressed={diffOnly}
          onClick={() => setDiffOnly((v) => !v)}
          className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-5 text-[15px] ${
            diffOnly ? "border-brass bg-brass-soft font-semibold text-brass-dark" : "border-line-strong bg-surface text-ink hover:border-ink"
          }`}
        >
          {diffOnly && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
          {label}
        </button>
        {toolbar}
      </div>
      {children}
    </div>
  );
}

/** Swaps the project in one column. */
export function ProjectPicker({
  locale,
  slugs,
  index,
  options,
  label,
  placeholder,
}: {
  locale: "ar" | "en";
  slugs: string[];
  index: number;
  options: { slug: string; name: Text }[];
  label: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const current = slugs[index] ?? "";
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted print:hidden">
      {label}
      <select
        value={current}
        onChange={(e) => {
          const next = [...slugs];
          next[index] = e.target.value;
          router.push(compareHref(locale, [...new Set(next.filter(Boolean))]), { scroll: false });
        }}
        className="min-h-12 rounded-xl border border-line-strong bg-surface px-3 text-base font-semibold text-ink focus:border-brand focus:outline-none"
      >
        {!current && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.slug} value={o.slug} disabled={o.slug !== current && slugs.includes(o.slug)}>
            {o.name[locale]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Keeps the visitor's saved list in step with the projects shown, so the header count matches. */
export function CompareSync({ items }: { items: CompareItem[] }) {
  const { replaceAll } = useCompareList();
  const key = items.map((i) => i.slug).join(",");
  useEffect(() => {
    replaceAll(items);
    // Only when the set of projects in the URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

/** With no ?p= in the URL, opens the visitor's saved list instead of an empty page. */
export function RestoreSavedList({ locale, children }: { locale: "ar" | "en"; children: ReactNode }) {
  const { items } = useCompareList();
  const router = useRouter();
  useEffect(() => {
    if (items.length) router.replace(compareHref(locale, items.map((i) => i.slug)));
  }, [items, locale, router]);
  return children;
}
