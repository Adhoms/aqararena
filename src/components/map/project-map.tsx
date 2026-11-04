"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import type { Locale } from "@/i18n/config";
import { useTheme } from "@/components/theme-toggle";
import type { ProjectStatus, PropertyCategory } from "@/lib/property";
import { matchesQuery } from "@/lib/search-text";
import { formatMillions } from "@/lib/format";

export type MapPoint = {
  slug: string;
  lat: number;
  lng: number;
  name: string;
  developer: string;
  developerSlug: string;
  area: string;
  district?: string;
  /** Land area, e.g. "85 فدان". */
  size?: string;
  /** "يبدأ من 6.50 مليون" */
  price?: string;
  /** The starting price in EGP, for the "from …" line on grouped pins. */
  priceValue?: number;
  down: string;
  delivery: number;
  category: PropertyCategory;
  status: ProjectStatus;
  score?: number;
  /** Names in both languages, developer, area and district, normalized for search. */
  search: string;
};

type Labels = {
  label: string;
  loading: string;
  showAll: string;
  /** "{n} projects here — click to zoom in" */
  cluster: string;
  inView: string;
  all: string;
  viewProject: string;
  categories: Record<PropertyCategory, string>;
  statuses: Record<ProjectStatus, string>;
  search: string;
  /** "{n} results" */
  searchResults: string;
  searchNone: string;
  searchClear: string;
  /** "{n} projects": Arabic counts take "مشروعين" for 2 and "مشروعات" for 3 to 10. */
  clusterCount: string;
  clusterCountTwo: string;
  clusterCountFew: string;
  /** "from {price}" */
  clusterFrom: string;
};

// Free vector map tiles, no API key (https://openfreemap.org). Map data © OpenStreetMap contributors.
const STYLES = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" };
// Shapes Arabic place names correctly on the map.
const RTL_PLUGIN = "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js";

const pinClass = (active: boolean) =>
  `flex flex-col items-center rounded-xl px-3 py-1 font-display leading-tight shadow-lg transition-transform cursor-pointer whitespace-nowrap border ${
    active ? "bg-brass-light text-brand border-brand scale-110 z-10" : "bg-brand text-white border-white/70 hover:scale-105"
  }`;

// Pins closer than this on screen (in px) are merged into one group marker.
const GROUP_DX = 140;
const GROUP_DY = 64;
// From this zoom on, every pin shows on its own.
const NO_GROUP_ZOOM = 13;

/**
 * A group of nearby projects, drawn like the logo: one brass dot per project, laid out as a
 * sunflower (golden-angle) spiral with a solid dot in the middle, next to the count and the
 * lowest starting price in the group.
 */
function clusterElement(group: MapPoint[], labels: Labels, locale: Locale) {
  const n = Math.min(group.length, 24);
  const r = n <= 6 ? 3.1 : n <= 12 ? 2.4 : 1.8;
  // Small groups stay compact; big ones fill the badge.
  const spread = 5 + 7.5 * Math.min(1, n / 14);
  const dots = Array.from({ length: n }, (_, i) => {
    const dist = i === 0 ? 0 : spread * Math.sqrt(i / (n - 1 || 1));
    const angle = i * 2.39996;
    const cx = (18 + dist * Math.cos(angle)).toFixed(2);
    const cy = (18 + dist * Math.sin(angle)).toFixed(2);
    // The middle dot is solid, the rest fade towards the edge.
    const opacity = i === 0 ? 1 : (0.95 - (0.45 * i) / n).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${i === 0 ? r + 0.9 : r}" fill-opacity="${opacity}"/>`;
  }).join("");

  const prices = group.map((g) => g.priceValue).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const from = prices.length ? labels.clusterFrom.replace("{price}", formatMillions(Math.min(...prices), locale)) : "";

  const el = document.createElement("div");
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "cluster-pop flex cursor-pointer items-center gap-2 rounded-full border border-brass-light/60 bg-brand/95 py-1.5 ps-1.5 pe-4 text-white shadow-[0_12px_28px_-12px_rgb(0_0_0/0.7)] backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-brass-light";
  button.title = group.map((g) => g.name).join(" · ");
  button.setAttribute("aria-label", labels.cluster.replace("{n}", String(group.length)));
  button.innerHTML = `
    <span class="flex size-10 flex-none items-center justify-center rounded-full bg-deep/70 ring-1 ring-brass-light/25">
      <svg viewBox="0 0 36 36" class="size-9 text-brass-light" fill="currentColor" aria-hidden="true">${dots}</svg>
    </span>
    <span class="flex flex-col items-start leading-tight">
      <span class="font-display text-[15px] font-medium whitespace-nowrap"></span>
      <span class="text-[11px] whitespace-nowrap text-brass-light"></span>
    </span>`;
  const [count, price] = button.querySelectorAll<HTMLElement>("span.flex-col > span");
  const total = group.length;
  const countLabel = total === 2 ? labels.clusterCountTwo : total <= 10 ? labels.clusterCountFew : labels.clusterCount;
  count.textContent = countLabel.replace("{n}", String(total));
  price.textContent = from;
  if (!from) price.remove();
  el.append(button);
  return { el, button };
}

function boundsOf(points: MapPoint[]): [[number, number], [number, number]] {
  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

type Props = {
  points: MapPoint[];
  locale: Locale;
  labels: Labels;
  /** "teaser": map only, two-finger/ctrl zoom so the page still scrolls. "explore": map with a synced list. */
  mode?: "teaser" | "explore";
  /** The search box over the map (off for a single project's location). */
  search?: boolean;
  className?: string;
};

export function ProjectMap({ points, locale, labels, mode = "explore", search = true, className = "" }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // `el` is the marker element MapLibre positions (its classes are MapLibre's); `pin` is the styled pin inside it.
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLElement; pin: HTMLElement }>());
  const router = useRouter();
  const theme = useTheme();
  // The style the map was created with; later mode changes swap it in place (see below).
  const themeAtCreate = useRef(theme);
  const listRefs = useRef(new Map<string, HTMLLIElement>());
  const [ready, setReady] = useState(false);
  // The map library is large: load it only once the map is about to scroll into view.
  const [near, setNear] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState<string[]>(points.map((p) => p.slug));
  const [category, setCategory] = useState<PropertyCategory | "all">("all");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  // Read by the map's grouping, which runs outside React's render.
  const activeRef = useRef(active);
  const regroupRef = useRef<() => void>(() => {});

  const categories = useMemo(() => [...new Set(points.map((p) => p.category))], [points]);
  const statuses = useMemo(() => [...new Set(points.map((p) => p.status))], [points]);
  // Everything the chips and the search box let through, wherever it is on the map.
  const matching = useMemo(
    () =>
      points.filter(
        (p) =>
          (category === "all" || p.category === category) &&
          (status === "all" || p.status === status) &&
          (!query.trim() || matchesQuery(p.search, query)),
      ),
    [points, category, status, query],
  );
  const matchingRef = useRef(new Set(matching.map((p) => p.slug)));
  const shown = matching.filter((p) => visible.includes(p.slug));
  const searching = query.trim().length > 0;

  useEffect(() => {
    const el = container.current;
    if (!el || near) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    const markerMap = markers.current;
    const clusterMarkers: Marker[] = [];
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !container.current || points.length === 0) return;
      if (maplibregl.getRTLTextPluginStatus() === "unavailable") {
        maplibregl.setRTLTextPlugin(RTL_PLUGIN, true).catch(() => {});
      }
      const map = new maplibregl.Map({
        container: container.current,
        // Read the mode from the page itself: on first load React may not have caught up with it yet.
        style: STYLES[(themeAtCreate.current = document.documentElement.dataset.theme === "dark" ? "dark" : "light")],
        bounds: boundsOf(points),
        fitBoundsOptions: { padding: 70, maxZoom: 11 },
        attributionControl: { compact: true },
        cooperativeGestures: mode === "teaser",
      });
      mapRef.current = map;
      map.on("error", (e) => console.warn("[map]", e.error?.message ?? e));
      if (process.env.NODE_ENV !== "production") (window as unknown as { __aqarMap?: MapLibreMap }).__aqarMap = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), locale === "ar" ? "top-left" : "top-right");

      for (const p of points) {
        // Pin: developer (link to the developer page), project (link to the project page), land area.
        // Clicking the pin anywhere else selects it and opens the summary card.
        const el = document.createElement("div");
        const pin = document.createElement("div");
        pin.className = pinClass(false);
        pin.setAttribute("role", "group");
        pin.setAttribute("aria-label", p.size ? `${p.name}: ${p.size}` : p.name);
        el.append(pin);
        const link = (href: string, text: string, className: string) => {
          const a = document.createElement("a");
          a.href = href;
          a.textContent = text;
          a.className = `text-inherit no-underline hover:underline hover:text-inherit ${className}`;
          a.addEventListener("click", (e) => {
            e.stopPropagation();
            // Keep new-tab clicks native; plain clicks navigate inside the app.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            router.push(href);
          });
          return a;
        };
        pin.append(link(`/${locale}/developers/${p.developerSlug}`, p.developer, "text-[11px] opacity-85"));
        pin.append(link(`/${locale}/projects/${p.slug}`, p.name, "text-[13px] font-semibold"));
        if (p.size) {
          const size = document.createElement("span");
          size.className = "text-[11px] opacity-80";
          size.textContent = p.size;
          pin.append(size);
        }
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setActive(p.slug);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
        markerMap.set(p.slug, { marker, el, pin });
      }

      // Merge pins that would overlap on screen into a numbered circle; clicking it zooms in until they split.
      const regroup = () => {
        clusterMarkers.splice(0).forEach((m) => m.remove());
        const candidates = points.filter((p) => matchingRef.current.has(p.slug));
        markerMap.forEach(({ el }) => (el.style.display = "none"));
        const pos = new Map(candidates.map((p) => [p.slug, map.project([p.lng, p.lat])]));
        const grouping = map.getZoom() < NO_GROUP_ZOOM;
        const taken = new Set<string>();

        for (const p of candidates) {
          if (taken.has(p.slug)) continue;
          taken.add(p.slug);
          const group = [p];
          // The picked project always shows as its own pin.
          // A pin joins the group if it is close to any pin already in it (so chains merge too).
          if (grouping && p.slug !== activeRef.current) {
            for (let i = 0; i < group.length; i++) {
              const a = pos.get(group[i].slug)!;
              for (const q of candidates) {
                if (taken.has(q.slug) || q.slug === activeRef.current) continue;
                const b = pos.get(q.slug)!;
                if (Math.abs(a.x - b.x) < GROUP_DX && Math.abs(a.y - b.y) < GROUP_DY) {
                  group.push(q);
                  taken.add(q.slug);
                }
              }
            }
          }
          if (group.length === 1) {
            markerMap.get(p.slug)!.el.style.display = "";
            continue;
          }
          // MapLibre positions `el`; the styled, animated button sits inside it.
          const { el, button } = clusterElement(group, labels, locale);
          const lng = group.reduce((t, g) => t + g.lng, 0) / group.length;
          const lat = group.reduce((t, g) => t + g.lat, 0) / group.length;
          button.addEventListener("click", (e) => {
            e.stopPropagation();
            // Fit the group, but always zoom in at least 1.5 levels so every click splits it further.
            const fit = map.cameraForBounds(boundsOf(group), { padding: 60 });
            const zoom = Math.min(Math.max(fit?.zoom ?? 0, map.getZoom() + 1.5), NO_GROUP_ZOOM + 0.5);
            map.easeTo({ center: fit?.center ?? [lng, lat], zoom, duration: 700 });
          });
          clusterMarkers.push(new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map));
        }
      };
      regroupRef.current = regroup;
      // Group straight away (positions are known before the tiles finish loading).
      regroup();
      map.on("zoomend", regroup);
      map.on("resize", regroup);

      const updateVisible = () => {
        const b = map.getBounds();
        setVisible(points.filter((p) => b.contains([p.lng, p.lat])).map((p) => p.slug));
      };
      map.on("moveend", updateVisible);
      map.on("click", () => setActive(null));
      map.on("load", () => {
        // Place names in the visitor's language, falling back to the local name.
        const nameField = ["coalesce", ["get", `name:${locale}`], ["get", locale === "en" ? "name_en" : "name"], ["get", "name"]];
        for (const layer of map.getStyle().layers ?? []) {
          if (layer.type === "symbol" && map.getLayoutProperty(layer.id, "text-field")) {
            map.setLayoutProperty(layer.id, "text-field", nameField as never);
          }
        }
        setReady(true);
        regroup();
        updateVisible();
      });
    })();
    return () => {
      cancelled = true;
      regroupRef.current = () => {};
      clusterMarkers.forEach((m) => m.remove());
      markerMap.forEach(({ marker }) => marker.remove());
      markerMap.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [near, points, locale, mode, labels, router]);

  // Light/dark switch: swap the tiles and put the place names back in the visitor's language.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || themeAtCreate.current === theme) return;
    themeAtCreate.current = theme;
    map.setStyle(STYLES[theme]);
    map.once("style.load", () => {
      const nameField = ["coalesce", ["get", `name:${locale}`], ["get", locale === "en" ? "name_en" : "name"], ["get", "name"]];
      for (const layer of map.getStyle().layers ?? []) {
        if (layer.type === "symbol" && map.getLayoutProperty(layer.id, "text-field")) {
          map.setLayoutProperty(layer.id, "text-field", nameField as never);
        }
      }
    });
  }, [theme, locale]);

  // Highlight the picked pin and bring its list row into view.
  useEffect(() => {
    markers.current.forEach(({ el, pin }, slug) => {
      pin.className = pinClass(slug === active);
      // Keep the picked pin above its neighbours.
      el.style.zIndex = slug === active ? "5" : "";
    });
    activeRef.current = active;
    regroupRef.current();
    if (active) listRefs.current.get(active)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  // Chips and search hide the other pins and regroup the rest.
  useEffect(() => {
    matchingRef.current = new Set(matching.map((p) => p.slug));
    regroupRef.current();
  }, [matching]);

  // While searching, frame the results after a short pause in typing; a single result opens its card.
  useEffect(() => {
    if (!searching) return;
    const t = setTimeout(() => {
      const map = mapRef.current;
      if (!map || matching.length === 0) return;
      if (matching.length === 1) {
        const p = matching[0];
        setActive(p.slug);
        map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 11), speed: 1.4 });
      } else {
        map.fitBounds(boundsOf(matching), { padding: 90, maxZoom: 12, duration: 800 });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [matching, searching]);

  const activePoint = points.find((p) => p.slug === active);

  function flyTo(p: MapPoint) {
    setActive(p.slug);
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: Math.max(mapRef.current.getZoom(), 10), speed: 1.4 });
  }

  const mapBox = (
    <div className="relative size-full min-h-80 overflow-hidden">
      {/* MapLibre makes its container position: relative, so the size comes from this wrapper. */}
      <div className="absolute inset-0">
        <div ref={container} role="region" aria-label={labels.label} className="size-full" />
      </div>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-plan text-sm text-body">{labels.loading}</div>
      )}
      {search && (
      <MapSearch
        query={query}
        onQuery={(q) => {
          setQuery(q);
          setHighlight(0);
          setSearchOpen(true);
        }}
        open={searchOpen && searching}
        onOpen={setSearchOpen}
        results={matching}
        highlight={highlight}
        onHighlight={setHighlight}
        onPick={(p) => {
          setSearchOpen(false);
          flyTo(p);
        }}
        labels={labels}
      />
      )}
      <button
        type="button"
        onClick={() => mapRef.current?.fitBounds(boundsOf(matching.length ? matching : points), { padding: 70, maxZoom: 11 })}
        className="press absolute bottom-8 start-3 rounded-full border border-line bg-surface/95 px-4 py-2 text-[13px] font-medium shadow backdrop-blur hover:border-ink"
      >
        {labels.showAll}
      </button>
      {activePoint && (
        <div className="absolute end-3 bottom-8 start-3 sm:start-auto sm:w-80">
          <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <Link href={`/${locale}/projects/${activePoint.slug}`} className="font-display text-lg font-medium text-ink no-underline hover:text-brass">
                  {activePoint.name}
                </Link>
                <span className="text-[13px] text-muted">
                  <Link href={`/${locale}/developers/${activePoint.developerSlug}`} className="text-muted underline-offset-2 hover:text-brass hover:underline">
                    {activePoint.developer}
                  </Link>{" "}
                  · {activePoint.area}
                </span>
              </div>
              <button type="button" aria-label="×" onClick={() => setActive(null)} className="size-8 flex-none rounded-full text-lg hover:bg-ground">
                ×
              </button>
            </div>
            {activePoint.price && <b className="font-display text-xl font-medium text-ink">{activePoint.price}</b>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              {activePoint.size && <span className="font-medium">{activePoint.size}</span>}
              <span>{activePoint.down}</span>
              <span>{activePoint.delivery}</span>
              <span className="text-brass">{labels.statuses[activePoint.status]}</span>
            </div>
            <Link
              href={`/${locale}/projects/${activePoint.slug}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand font-medium text-white no-underline hover:bg-brand-2 hover:text-white"
            >
              {labels.viewProject}
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  if (mode === "teaser") return <div className={className}>{mapBox}</div>;

  return (
    <div className={`flex flex-col-reverse lg:flex-row ${className}`}>
      <aside className="flex max-h-[45vh] flex-col border-line bg-surface lg:max-h-none lg:w-[380px] lg:flex-none lg:border-e">
        <div className="flex flex-col gap-3 border-b border-divider p-4">
          <span aria-live="polite" className="text-sm font-semibold">
            {labels.inView.replace("{n}", String(shown.length))}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...categories] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`min-h-9 rounded-full border px-3.5 text-[13px] ${
                  category === c ? "border-brand bg-brand font-medium text-white" : "border-line-strong hover:border-ink"
                }`}
              >
                {c === "all" ? labels.all : labels.categories[c]}
              </button>
            ))}
          </div>
          {statuses.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {(["all", ...statuses] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  aria-pressed={status === st}
                  onClick={() => setStatus(st)}
                  className={`min-h-8 rounded-full border px-3 text-[12px] ${
                    status === st ? "border-brass bg-brass-soft font-medium text-ink" : "border-line hover:border-ink"
                  }`}
                >
                  {st === "all" ? labels.all : labels.statuses[st]}
                </button>
              ))}
            </div>
          )}
        </div>
        <ul className="flex-1 overflow-y-auto">
          {shown.map((p) => (
            <li
              key={p.slug}
              ref={(el) => {
                if (el) listRefs.current.set(p.slug, el);
                else listRefs.current.delete(p.slug);
              }}
            >
              <button
                type="button"
                onClick={() => flyTo(p)}
                onMouseEnter={() => markers.current.get(p.slug)?.pin.classList.add("scale-110")}
                onMouseLeave={() => markers.current.get(p.slug)?.pin.classList.remove("scale-110")}
                className={`flex w-full flex-col gap-0.5 border-b border-divider px-4 py-3 text-start hover:bg-ground ${active === p.slug ? "bg-brass-soft" : ""}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display font-medium">{p.name}</span>
                  {p.price ? (
                    <span className="font-display text-sm font-medium text-ink">{p.price}</span>
                  ) : (
                    p.size && <span className="font-display text-sm font-medium text-muted">{p.size}</span>
                  )}
                </span>
                <span className="flex justify-between gap-3 text-[13px] text-muted">
                  <span>
                    {p.developer} · {p.area}
                  </span>
                  <span className="text-brass">{labels.statuses[p.status]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="relative min-h-[55vh] flex-1">{mapBox}</div>
    </div>
  );
}

/** The search box over the map: filters the pins as you type and lists the matches to jump to. */
function MapSearch({
  query,
  onQuery,
  open,
  onOpen,
  results,
  highlight,
  onHighlight,
  onPick,
  labels,
}: {
  query: string;
  onQuery: (q: string) => void;
  open: boolean;
  onOpen: (open: boolean) => void;
  results: MapPoint[];
  highlight: number;
  onHighlight: (i: number) => void;
  onPick: (p: MapPoint) => void;
  labels: Labels;
}) {
  const list = results.slice(0, 7);
  const searching = query.trim().length > 0;
  return (
    <div className="absolute end-14 top-3 start-3 z-10 max-w-md">
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface/95 px-3 shadow-lg backdrop-blur focus-within:border-brand">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 flex-none text-muted" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="map-search-results"
          aria-label={labels.search}
          placeholder={labels.search}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onFocus={() => onOpen(true)}
          onBlur={() => setTimeout(() => onOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              onHighlight(Math.min(highlight + 1, list.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              onHighlight(Math.max(highlight - 1, 0));
            } else if (e.key === "Enter" && list[highlight]) {
              e.preventDefault();
              onPick(list[highlight]);
            } else if (e.key === "Escape") {
              onQuery("");
            }
          }}
          className="min-h-11 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {searching && (
          <>
            <span aria-live="polite" className="flex-none text-[12px] whitespace-nowrap text-muted">
              {results.length ? labels.searchResults.replace("{n}", String(results.length)) : labels.searchNone}
            </span>
            <button
              type="button"
              aria-label={labels.searchClear}
              onClick={() => onQuery("")}
              className="flex size-7 flex-none items-center justify-center rounded-full text-lg text-muted hover:bg-ground hover:text-ink"
            >
              ×
            </button>
          </>
        )}
      </div>
      {open && list.length > 0 && (
        <ul id="map-search-results" role="listbox" className="mt-1.5 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          {list.map((p, i) => (
            <li key={p.slug} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => onHighlight(i)}
                onClick={() => onPick(p)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-start ${i === highlight ? "bg-brass-soft" : ""}`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-display font-medium text-ink">{p.name}</span>
                  <span className="truncate text-[12px] text-muted">{[p.developer, p.district, p.area].filter(Boolean).join(" · ")}</span>
                </span>
                {p.price && <span className="flex-none text-[12px] font-medium text-ink">{p.price}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
