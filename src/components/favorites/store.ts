"use client";

import { useSyncExternalStore } from "react";

// The visitor's saved projects, kept in localStorage (no account needed) and in sync across tabs.
// The favorites page reads ?p= from the URL, so a shared list opens for anyone.

const KEY = "aqararena:favorites";
const MAX = 100;
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, MAX) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot() {
  cache ??= read();
  return cache;
}

function write(next: string[]) {
  cache = next.slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Private mode or storage full: the list still works for this page view.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFavorites() {
  const slugs = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  return {
    slugs,
    has: (slug: string) => slugs.includes(slug),
    // Read the live list, not this render's copy, so quick clicks on several hearts all count.
    toggle: (slug: string) => {
      const current = getSnapshot();
      write(current.includes(slug) ? current.filter((s) => s !== slug) : [slug, ...current]);
    },
    replaceAll: (next: string[]) => write(next),
  };
}
