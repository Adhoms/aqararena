"use client";

import { useSyncExternalStore } from "react";
import type { Text } from "@/lib/catalog/types";
import { MAX_COMPARE } from "@/lib/compare";

// The visitor's comparison list, kept in localStorage so it survives page loads
// and stays in sync across tabs. The comparison page itself reads ?p= from the URL,
// so a shared link works without this list.

export type CompareItem = { slug: string; name: Text };

const KEY = "aqararena:compare";
const EMPTY: CompareItem[] = [];
const listeners = new Set<() => void>();
let cache: CompareItem[] | null = null;

function read(): CompareItem[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(value)) return EMPTY;
    return value
      .filter((v): v is CompareItem => typeof v?.slug === "string" && typeof v?.name?.ar === "string")
      .slice(0, MAX_COMPARE);
  } catch {
    return EMPTY;
  }
}

function getSnapshot() {
  cache ??= read();
  return cache;
}

function write(next: CompareItem[]) {
  cache = next.slice(0, MAX_COMPARE);
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

export function useCompareList() {
  const items = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  return {
    items,
    has: (slug: string) => items.some((i) => i.slug === slug),
    toggle: (item: CompareItem) =>
      write(items.some((i) => i.slug === item.slug) ? items.filter((i) => i.slug !== item.slug) : [...items, item].slice(-MAX_COMPARE)),
    replaceAll: (next: CompareItem[]) => write(next),
    clear: () => write([]),
  };
}
