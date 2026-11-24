"use client";

import { useState } from "react";

/** At most this long for the offer's pictures to load before printing anyway. */
const WAIT_MS = 8_000;

/**
 * «طباعة / حفظ PDF»: loads the sheets' pictures first (they are lazy on screen, and a browser may print
 * a picture it hasn't loaded as a blank), then opens the print dialog.
 */
export function PrintOffer({ label, className = "" }: { label: string; className?: string }) {
  const [busy, setBusy] = useState(false);

  async function print() {
    setBusy(true);
    try {
      const images = Array.from(document.images);
      for (const image of images) image.loading = "eager";
      const loaded = Promise.all(images.map((image) => image.decode().catch(() => undefined)));
      await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, WAIT_MS))]);
    } finally {
      setBusy(false);
      window.print();
    }
  }

  return (
    <button type="button" onClick={print} disabled={busy} aria-busy={busy} className={`${className} disabled:opacity-70`}>
      {label}
    </button>
  );
}
