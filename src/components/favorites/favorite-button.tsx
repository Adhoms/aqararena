"use client";

import { Heart } from "@phosphor-icons/react";
import { useFavorites } from "./store";

type Props = {
  slug: string;
  labels: { add: string; remove: string };
  /** "onImage" sits on a dark render; "plain" sits on the page. */
  variant?: "onImage" | "plain";
  className?: string;
};

/** Saves a project to the visitor's favorites (this browser, no account). */
export function FavoriteButton({ slug, labels, variant = "plain", className = "" }: Props) {
  const { has, toggle } = useFavorites();
  const saved = has(slug);
  const label = saved ? labels.remove : labels.add;
  const look =
    variant === "onImage"
      ? saved
        ? "border-brass-light bg-deep/60 text-brass-light"
        : "border-white/25 bg-white/10 text-white hover:bg-white/20"
      : saved
        ? "border-brass bg-brass-soft text-brass"
        : "border-line-strong bg-surface text-ink hover:border-ink";
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={label}
      title={label}
      onClick={() => toggle(slug)}
      className={`press inline-flex size-11 flex-none items-center justify-center rounded-full border ${look} ${className}`}
    >
      <Heart size={20} weight={saved ? "fill" : "regular"} aria-hidden="true" />
    </button>
  );
}
