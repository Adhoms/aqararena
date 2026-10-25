"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import type { Locale } from "@/i18n/config";
import type { PropertyCategory } from "@/lib/property";

export type MapPoint = {
  slug: string;
  lat: number;
  lng: number;
  name: string;
  developer: string;
  area: string;
  /** Land area, e.g. "85 فدان". */
  size?: string;
  down: string;
  delivery: number;
  category: PropertyCategory;
  score?: number;
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
};

// Free vector map tiles, no API key (https://openfreemap.org). Map data © OpenStreetMap contributors.
const STYLE = "https://tiles.openfreemap.org/styles/dark";
// Shapes Arabic place names correctly on the map.
const RTL_PLUGIN = "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js";

const pinClass = (active: boolean) =>
  `flex flex-col items-center rounded-xl px-3 py-1 font-display leading-tight shadow-lg transition-transform cursor-pointer whitespace-nowrap border ${
    active ? "bg-brass-light text-brand border-brand scale-110 z-10" : "bg-brand text-white border-white/70 hover:scale-105"
  }`;

// Pins closer than this on screen (in px) are merged into one numbered circle.
const GROUP_DX = 100;
const GROUP_DY = 52;
// From this zoom on, every pin shows on its own.
const NO_GROUP_ZOOM = 13;

const clusterClass =
  "flex size-12 items-center justify-center rounded-full border-2 border-deep bg-brass-light font-display text-lg font-semibold text-deep shadow-[0_0_0_6px_rgb(205_174_116/0.25)] transition-transform cursor-pointer hover:scale-110";

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
  className?: string;
};

export function ProjectMap({ points, locale, labels, mode = "explore", className = "" }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const listRefs = useRef(new Map<string, HTMLLIElement>());
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState<string[]>(points.map((p) => p.slug));
  const [category, setCategory] = useState<PropertyCategory | "all">("all");
  // Read by the map's grouping, which runs outside React's render.
  const activeRef = useRef(active);
  const categoryRef = useRef(category);
  const regroupRef = useRef<() => void>(() => {});

  const categories = useMemo(() => [...new Set(points.map((p) => p.category))], [points]);
  const shown = points.filter((p) => (category === "all" || p.category === category) && visible.includes(p.slug));

  useEffect(() => {
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
        style: STYLE,
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
        const el = document.createElement("button");
        el.type = "button";
        el.className = pinClass(false);
        const name = document.createElement("span");
        name.className = "text-[13px] font-medium";
        name.textContent = p.name;
        el.append(name);
        if (p.size) {
          const size = document.createElement("span");
          size.className = "text-[11px] opacity-80";
          size.textContent = p.size;
          el.append(size);
        }
        el.setAttribute("aria-label", p.size ? `${p.name} — ${p.size}` : p.name);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setActive(p.slug);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
        markerMap.set(p.slug, { marker, el });
      }

      // Merge pins that would overlap on screen into a numbered circle; clicking it zooms in until they split.
      const regroup = () => {
        clusterMarkers.splice(0).forEach((m) => m.remove());
        const cat = categoryRef.current;
        const candidates = points.filter((p) => cat === "all" || p.category === cat);
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
          const el = document.createElement("button");
          el.type = "button";
          el.className = clusterClass;
          el.textContent = String(group.length);
          el.title = group.map((g) => g.name).join(" · ");
          el.setAttribute("aria-label", labels.cluster.replace("{n}", String(group.length)));
          const lng = group.reduce((t, g) => t + g.lng, 0) / group.length;
          const lat = group.reduce((t, g) => t + g.lat, 0) / group.length;
          el.addEventListener("click", (e) => {
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
  }, [points, locale, mode, labels.cluster]);

  // Highlight the picked pin and bring its list row into view.
  useEffect(() => {
    markers.current.forEach(({ el }, slug) => (el.className = pinClass(slug === active)));
    activeRef.current = active;
    regroupRef.current();
    if (active) listRefs.current.get(active)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  // Category chips hide the other pins (and regroup the rest).
  useEffect(() => {
    categoryRef.current = category;
    regroupRef.current();
  }, [category]);

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
      <button
        type="button"
        onClick={() => mapRef.current?.fitBounds(boundsOf(points), { padding: 70, maxZoom: 11 })}
        className="press absolute bottom-8 start-3 rounded-full border border-line bg-surface/95 px-4 py-2 text-[13px] font-medium shadow backdrop-blur hover:border-ink"
      >
        {labels.showAll}
      </button>
      {activePoint && (
        <div className="absolute end-3 bottom-8 start-3 sm:start-auto sm:w-80">
          <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-display text-lg font-medium">{activePoint.name}</span>
                <span className="text-[13px] text-muted">
                  {activePoint.developer} · {activePoint.area}
                </span>
              </div>
              <button type="button" aria-label="×" onClick={() => setActive(null)} className="size-8 flex-none rounded-full text-lg hover:bg-ground">
                ×
              </button>
            </div>
            <div className="flex gap-4 text-[13px]">
              {activePoint.size && <b className="font-display text-base font-medium">{activePoint.size}</b>}
              <span>{activePoint.down}</span>
              <span>{activePoint.delivery}</span>
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
                onMouseEnter={() => markers.current.get(p.slug)?.el.classList.add("scale-110")}
                onMouseLeave={() => markers.current.get(p.slug)?.el.classList.remove("scale-110")}
                className={`flex w-full flex-col gap-0.5 border-b border-divider px-4 py-3 text-start hover:bg-ground ${active === p.slug ? "bg-brass-soft" : ""}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display font-medium">{p.name}</span>
                  {p.size && <span className="font-display text-sm font-medium text-muted">{p.size}</span>}
                </span>
                <span className="text-[13px] text-muted">
                  {p.developer} · {p.area} · {labels.categories[p.category]}
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
