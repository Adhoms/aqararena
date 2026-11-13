"use client";

import { Check } from "@phosphor-icons/react";
import type { Text } from "@/lib/catalog/types";
import { trackAttr } from "@/lib/stats-events";
import { useCompareList } from "./store";

type Props = {
  slug: string;
  name: Text;
  labels: { add: string; added: string };
  /** "solid" for the project page header, "outline" for cards, "onImage" over a dark render. */
  variant?: "solid" | "outline" | "onImage";
  className?: string;
};

export function CompareButton({ slug, name, labels, variant = "outline", className = "" }: Props) {
  const { has, toggle } = useCompareList();
  const added = has(slug);

  const base = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 font-medium transition-colors";
  const look =
    variant === "onImage"
      ? added
        ? "border border-brass-light bg-deep/60 font-semibold text-brass-light"
        : "border border-white/25 bg-white/10 text-white hover:bg-white/20"
      : added
        ? "border border-brass bg-brass-soft font-semibold text-brass-dark"
        : variant === "solid"
          ? "bg-brand text-white hover:bg-brand-2"
          : "border border-line-strong bg-surface text-ink hover:border-ink";

  return (
    <button
      type="button"
      aria-pressed={added}
      onClick={() => toggle({ slug, name })}
      data-track={added ? undefined : trackAttr("COMPARE", slug)}
      className={`${base} ${look} ${className}`}
    >
      {added ? (
        <>
          <Check size={16} weight="bold" aria-hidden="true" />
          {labels.added}
        </>
      ) : (
        labels.add
      )}
    </button>
  );
}
