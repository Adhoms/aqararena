"use client";

import { useEffect } from "react";
import { parseTrackAttr, type StatEvent } from "@/lib/stats-events";

// Reports visitor actions for the developer statistics. Each action counts once per project per
// browser session (kept in sessionStorage), and nothing identifies the visitor.

function track(event: StatEvent, slug: string) {
  try {
    if (navigator.webdriver) return;
    const key = `aqararena:t:${event}:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Private mode: count it anyway, once per page view.
  }
  const body = JSON.stringify({ slug, event });
  if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
    void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  }
}

/** Counts a page view (or an offer-sheet view) when the page opens. */
export function TrackView({ slug, event = "VIEW" }: { slug: string; event?: StatEvent }) {
  useEffect(() => track(event, slug), [event, slug]);
  return null;
}

/** One listener for the whole site: any element with data-track="EVENT:slug" counts when clicked. */
export function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-track]");
      const hit = parseTrackAttr(el?.getAttribute("data-track"));
      if (hit) track(hit.event, hit.slug);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
