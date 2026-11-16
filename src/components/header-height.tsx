"use client";

import { useEffect, useRef } from "react";

/**
 * Publishes the sticky header's real height as --header-h on <html>. The CSS values are only the
 * first-paint guess; the header wraps to more rows on very narrow screens and grows with the
 * root font size, and the sticky bars and anchor offsets below it must follow.
 */
export function HeaderHeight() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const header = marker.current?.closest("header");
    if (!header) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--header-h", `${header.getBoundingClientRect().height}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--header-h");
    };
  }, []);
  return <span ref={marker} hidden />;
}
