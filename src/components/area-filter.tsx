"use client";

import { useState, type ReactNode } from "react";

type Item = { key: string; group: string; node: ReactNode };

/** Filter chips over a server-rendered grid (e.g. a developer's projects by area). */
export function GroupFilter({
  items,
  groups,
  allLabel,
  label,
  countLabel,
}: {
  items: Item[];
  groups: { id: string; label: string }[];
  allLabel: string;
  label: string;
  /** e.g. "{n} مشروع" */
  countLabel: string;
}) {
  const [active, setActive] = useState("all");
  const shown = items.filter((i) => active === "all" || i.group === active);

  return (
    <div className="flex flex-col gap-5.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={label} className="flex flex-wrap gap-2">
          {[{ id: "all", label: allLabel }, ...groups].map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={active === g.id}
              onClick={() => setActive(g.id)}
              className={`min-h-11 rounded-full border px-4.5 text-[15px] ${
                active === g.id ? "border-brand bg-brand font-medium text-white" : "border-line-strong bg-surface text-ink hover:border-ink"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <span aria-live="polite" className="text-sm text-muted">
          {countLabel.replace("{n}", String(shown.length))}
        </span>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-5">
        {shown.map((i) => (
          <li key={i.key}>{i.node}</li>
        ))}
      </ul>
    </div>
  );
}
