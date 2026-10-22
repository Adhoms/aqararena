"use client";

import type { Text } from "@/lib/catalog/types";
import { useCompareList } from "./store";

type Props = {
  slug: string;
  name: Text;
  labels: { add: string; added: string };
  /** "solid" for the project page header, "outline" for cards. */
  variant?: "solid" | "outline";
  className?: string;
};

export function CompareButton({ slug, name, labels, variant = "outline", className = "" }: Props) {
  const { has, toggle } = useCompareList();
  const added = has(slug);

  const base = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 font-medium transition-colors";
  const look = added
    ? "border border-brass bg-brass-soft font-semibold text-brass-dark"
    : variant === "solid"
      ? "bg-brand text-white hover:bg-brand-2"
      : "border border-line-strong bg-surface text-ink hover:border-ink";

  return (
    <button type="button" aria-pressed={added} onClick={() => toggle({ slug, name })} className={`${base} ${look} ${className}`}>
      {added ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M5 12l5 5L20 7" />
          </svg>
          {labels.added}
        </>
      ) : (
        labels.add
      )}
    </button>
  );
}
