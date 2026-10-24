"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SearchResponse } from "@/app/api/search/route";
import type { Locale } from "@/i18n/config";
import { fill, formatMillions } from "@/lib/format";
import type { AreaSlug, PropertyCategory, SubType } from "@/lib/property";
import { filtersToSearchParams, parseSmartQuery, withoutChip, type Chip } from "@/lib/smart-search";

export type SmartLabels = {
  label: string;
  placeholder: string;
  go: string;
  tryLabel: string;
  examples: string[];
  understood: string;
  results: string;
  noMatch: string;
  seeAll: string;
  searching: string;
  remove: string;
  chips: Record<"maxPrice" | "maxDownPct" | "minYears" | "minBedrooms" | "deliveryBy" | "ready" | "q", string>;
  subTypes: Record<SubType, string>;
  categories: Record<PropertyCategory, string>;
  areas: Record<AreaSlug, string>;
  from: string;
  down: string;
  delivery: string;
};

const chipId = (c: Chip) => `${c.key}:${"value" in c ? c.value : ""}`;

function chipLabel(c: Chip, l: SmartLabels) {
  switch (c.key) {
    case "subType":
      return l.subTypes[c.value];
    case "category":
      return l.categories[c.value];
    case "area":
      return l.areas[c.value];
    case "ready":
      return l.chips.ready;
    case "maxPrice":
      return fill(l.chips.maxPrice, { n: Math.round((c.value / 1_000_000) * 100) / 100 });
    case "q":
      return fill(l.chips.q, { q: c.value });
    default:
      return fill(l.chips[c.key], { n: c.value });
  }
}

type Props = {
  locale: Locale;
  labels: SmartLabels;
  /** "hero" sits on the dark home hero; "page" on the light projects page. */
  variant?: "hero" | "page";
  initialText?: string;
};

/**
 * One search box that understands a sentence. What it understood shows as chips (removable),
 * with a live count and the best matches underneath. Enter opens the full results.
 */
export function SmartSearch({ locale, labels, variant = "hero", initialText = "" }: Props) {
  const router = useRouter();
  const inputId = useId();
  const [text, setText] = useState(initialText);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { chips, filters } = useMemo(() => {
    const parsed = parseSmartQuery(text);
    const kept = parsed.chips.filter((c) => !removed.has(chipId(c)));
    const f = parsed.chips.filter((c) => removed.has(chipId(c))).reduce(withoutChip, parsed.filters);
    return { chips: kept, filters: f };
  }, [text, removed]);

  const query = filtersToSearchParams(filters).toString();
  const active = text.trim().length > 0;
  // On the projects page the results are already listed below; preview only once the sentence changes.
  const showPanel = active && (variant === "hero" || text !== initialText);
  const resultsHref = `/${locale}/projects?${query}${query ? "&" : ""}s=${encodeURIComponent(text.trim())}`;

  // Live results, a moment after typing stops.
  useEffect(() => {
    if (!showPanel) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?${query}`, { signal: controller.signal });
        if (res.ok) setResult(await res.json());
      } catch {
        // Typing again cancels the previous request.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, showPanel]);

  // Rotating example in the placeholder while the box is empty.
  useEffect(() => {
    if (active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setExampleIndex((i) => (i + 1) % labels.examples.length), 3500);
    return () => clearInterval(timer);
  }, [active, labels.examples.length]);

  const onDark = variant === "hero";

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active) router.push(resultsHref);
        }}
        className={`overflow-hidden rounded-[22px] text-ink ${onDark ? "bg-[#0d2426]/85 backdrop-blur-xl border border-white/15" : "bg-surface"} ${onDark ? "shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]" : "border border-line"}`}
      >
        <div className="flex items-center gap-2 p-2">
          <label htmlFor={inputId} className="sr-only">
            {labels.label}
          </label>
          <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center rounded-2xl bg-brass-soft text-brass">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
              <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
            </svg>
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            value={text}
            autoComplete="off"
            onChange={(e) => {
              setText(e.target.value);
              setRemoved(new Set());
            }}
            placeholder={active ? "" : `${labels.tryLabel} ${labels.examples[exampleIndex]}`}
            className="min-h-13 min-w-0 flex-1 bg-transparent px-1 text-[17px] outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            className="inline-flex min-h-13 flex-none items-center gap-2 rounded-2xl bg-brand px-5 font-medium text-white hover:bg-brand-2 sm:px-7"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="hidden sm:inline">{labels.go}</span>
          </button>
        </div>

        {showPanel && (
          <div className="flex flex-col gap-3 border-t border-divider px-4 pt-3 pb-4" aria-live="polite">
            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-muted">{labels.understood}</span>
                {chips.map((c) => {
                  const label = chipLabel(c, labels);
                  return (
                    <button
                      key={chipId(c)}
                      type="button"
                      onClick={() => setRemoved((r) => new Set(r).add(chipId(c)))}
                      aria-label={fill(labels.remove, { label })}
                      className="group inline-flex min-h-8 items-center gap-1.5 rounded-full bg-brass-soft px-3 text-[13px] font-medium text-brass-dark hover:bg-best"
                    >
                      {label}
                      <span aria-hidden="true" className="text-brass group-hover:text-brass-dark">
                        ×
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">
                {loading && !result ? labels.searching : result ? fill(labels.results, { n: result.count }) : labels.searching}
              </span>
              {result && result.count > 0 && (
                <Link href={resultsHref} className="font-semibold">
                  {labels.seeAll} {locale === "ar" ? "←" : "→"}
                </Link>
              )}
            </div>

            {result && result.count === 0 && <p className="text-sm text-body">{labels.noMatch}</p>}

            {result && result.hits.length > 0 && (
              <ul className={`flex flex-col divide-y divide-divider transition-opacity ${loading ? "opacity-60" : ""}`}>
                {result.hits.map((hit) => (
                  <li key={hit.slug}>
                    <Link
                      href={`/${locale}/projects/${hit.slug}`}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-ink no-underline hover:text-brand"
                    >
                      <span className="flex flex-col">
                        <span className="font-display font-medium">{hit.name[locale]}</span>
                        <span className="text-[13px] text-muted">
                          {hit.developer[locale]} · {labels.areas[hit.area as AreaSlug]}
                        </span>
                      </span>
                      <span className="flex gap-4 text-[13px]">
                        <span>
                          <span className="text-muted">{labels.from} </span>
                          <b>{formatMillions(hit.startingPrice, locale)}</b>
                        </span>
                        <span>
                          <span className="text-muted">{labels.down} </span>
                          <b>{hit.minDownPct}%</b>
                        </span>
                        <span>
                          <span className="text-muted">{labels.delivery} </span>
                          <b>{hit.deliveryYear}</b>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>

      {!active && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className={onDark ? "text-on-dark-muted" : "text-muted"}>{labels.tryLabel}</span>
          {labels.examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setText(example);
                inputRef.current?.focus();
              }}
              className={`min-h-9 rounded-full border px-3.5 ${
                onDark ? "border-white/20 text-on-dark hover:border-brass-light hover:text-white" : "border-line-strong text-body hover:border-ink"
              }`}
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
