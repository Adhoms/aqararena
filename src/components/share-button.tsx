"use client";

import { useState } from "react";

/** Opens the phone's share sheet, or copies the page link on desktop. */
/** `addQuery` (e.g. "shared=1") is added to the shared link only, not to the page the visitor is on. */
export function ShareButton({
  label,
  copiedLabel,
  title,
  addQuery,
  className = "",
}: {
  label: string;
  copiedLabel: string;
  title: string;
  addQuery?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const link = new URL(window.location.href);
    if (addQuery) new URLSearchParams(addQuery).forEach((v, k) => link.searchParams.set(k, v));
    const url = link.toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // The visitor closed the share sheet; fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(label, url);
    }
  }

  return (
    <button type="button" onClick={share} className={className}>
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}

export function PrintButton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {label}
    </button>
  );
}
