"use client";

import { useState } from "react";

/** Opens the phone's share sheet, or copies the page link on desktop. */
export function ShareButton({ label, copiedLabel, title, className = "" }: { label: string; copiedLabel: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
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
