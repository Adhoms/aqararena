"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

export type Theme = "light" | "dark";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Re-renders whenever <html data-theme> changes. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => "light");
}

/** Light is the default; this switches to dark and back, and remembers the choice. */
export function ThemeToggle({ toDark, toLight }: { toDark: string; toLight: string }) {
  const theme = useTheme();
  const label = theme === "dark" ? toLight : toDark;

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    if (next === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode: the choice lasts for this page only.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="press inline-flex size-11 items-center justify-center rounded-full border border-line text-ink hover:border-line-strong hover:bg-ink/5"
    >
      {theme === "dark" ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
