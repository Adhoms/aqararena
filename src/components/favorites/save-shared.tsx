"use client";

import { useState } from "react";
import { useFavorites } from "./store";

/** On a shared favorites link: copies that list into this visitor's own favorites. */
export function SaveSharedList({ slugs, labels }: { slugs: string[]; labels: { save: string; saved: string } }) {
  const { slugs: mine, replaceAll } = useFavorites();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        replaceAll([...new Set([...slugs, ...mine])]);
        setDone(true);
      }}
      className="press inline-flex min-h-11 items-center rounded-full bg-brand px-5 font-medium text-white hover:bg-brand-2"
    >
      <span aria-live="polite">{done ? labels.saved : labels.save}</span>
    </button>
  );
}
