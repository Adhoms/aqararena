"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FormResultContext } from "@/components/admin/admin-form";
import type { FormState } from "@/lib/admin/form";

type Result = { state: FormState; heading: HTMLElement | null };

/**
 * Shows the result of the hold forms inside it («اتحجزت ليك ✓…», a lost race…). Every hold action
 * refreshes the page, which removes the form that ran it (a cancelled hold's buttons, the hold form
 * once the unit is held), so the message lives here, in a live region that stays. Once the page has
 * refreshed, focus moves to the heading of the section the form was in, or to the message.
 */
export function HoldStatus({ children, top = false }: { children: ReactNode; top?: boolean }) {
  const [result, setResult] = useState<Result | null>(null);
  const status = useRef<HTMLParagraphElement>(null);

  // Read before the refresh lands: the form is still on the page now, and may not be after.
  const report = useCallback((state: FormState, form: HTMLFormElement | null) => {
    setResult({ state, heading: form?.closest("section")?.querySelector<HTMLElement>("h2") ?? null });
  }, []);

  useEffect(() => {
    if (!result?.state.message) return;
    const heading = result.heading?.isConnected ? result.heading : null;
    if (heading && !heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    (heading ?? status.current)?.focus();
  }, [result]);

  const tone = result?.state.ok ? "text-brand" : "text-red-700 dark:text-red-300";
  // Never display:none, so screen readers keep listening to it; while empty it takes no room.
  const message = (
    <p ref={status} role="status" aria-live="polite" tabIndex={-1} className={`m-0 text-sm empty:sr-only ${top ? "admin-panel" : ""} ${tone}`}>
      {result?.state.message}
    </p>
  );
  return (
    <FormResultContext value={report}>
      {top && message}
      {children}
      {!top && message}
    </FormResultContext>
  );
}
