"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type Tab = { id: string; label: string; content: ReactNode };

/**
 * Pill tabs with the WAI-ARIA tabs pattern (arrow keys move between tabs).
 * Tab panels are rendered on the server and passed in as `content`.
 */
export function Tabs({ tabs, label, header }: { tabs: Tab[]; label: string; header?: ReactNode }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const rtl = document.documentElement.dir === "rtl";
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-5.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {header}
        {tabs.length > 1 && (
          <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
            {tabs.map((tab, i) => {
              const selected = tab.id === active;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${base}-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`${base}-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(tab.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={`min-h-11 rounded-full border px-4.5 text-[15px] ${
                    selected ? "border-brand bg-brand font-medium text-white" : "border-line-strong bg-surface text-ink hover:border-ink"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role={tabs.length > 1 ? "tabpanel" : undefined}
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={tabs.length > 1 ? `${base}-tab-${tab.id}` : undefined}
          hidden={tab.id !== active}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
