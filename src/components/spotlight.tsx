"use client";

import { useEffect } from "react";

/** Feeds the cursor position to every `.spotlight` card under it, so its edge lights up (see globals.css). */
export function Spotlight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;

    const paint = () => {
      frame = 0;
      const card = (last?.target as Element | null)?.closest<HTMLElement>(".spotlight");
      if (!card || !last) return;
      const box = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${last.clientX - box.left}px`);
      card.style.setProperty("--my", `${last.clientY - box.top}px`);
    };

    const onMove = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
