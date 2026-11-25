"use client";

import { useEffect, useRef, useState } from "react";

/** A zone's box on the master plan, in percent of the image, measured from its top-left corner. */
export type ZoneBox = { x: number; y: number; w: number; h: number; label: string };

/**
 * The master-plan image with one zone marked. The box is placed over the image itself (not a padded
 * frame), so the admin's percentages land where they were measured. Used by the Sales unit page and
 * the client's offer.
 *
 * The frame hugs the image, at most as tall as `--plan-max-h` (70vh unless the caller's class sets it)
 * and as wide as its container. Until the image's proportions are known (no script yet, or still
 * loading) it takes the image's own size, which fits photos and SVGs with a width and height. Once the
 * image has loaded, the frame takes the image's proportions instead: an SVG with only a viewBox has no
 * size of its own and would otherwise shrink to nothing.
 */
export function MarkedPlan({
  image,
  zone,
  alt,
  className = "",
  loading,
}: {
  image: string;
  zone: ZoneBox | null;
  alt: string;
  /** Extra classes for the frame, e.g. corners, or "[--plan-max-h:49cqw]" to change the height cap. */
  className?: string;
  /** "eager" where the plan is printed (the client's offer). */
  loading?: "eager" | "lazy";
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    const read = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) setRatio(img.naturalWidth / img.naturalHeight);
    };
    if (img.complete) read();
    img.addEventListener("load", read);
    return () => img.removeEventListener("load", read);
  }, [image]);

  const maxHeight = "var(--plan-max-h, 70vh)";
  return (
    <div
      className={`relative mx-auto max-w-full ${className}`}
      style={{ width: ratio ? `min(100%, calc(${maxHeight} * ${ratio}))` : "fit-content" }}
      dir="ltr"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded plan of unknown size */}
      <img
        ref={ref}
        src={image}
        alt={alt}
        loading={loading}
        decoding="async"
        className="block h-auto"
        style={ratio ? { width: "100%" } : { width: "auto", maxWidth: "100%", maxHeight }}
      />
      {zone && (
        <span
          className="absolute rounded-md border-[3px] border-brass-light bg-brass-light/25 shadow-[0_0_0_3px_rgb(255_255_255/0.7)]"
          style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` }}
        >
          <span className="sr-only">{zone.label}</span>
        </span>
      )}
    </div>
  );
}
