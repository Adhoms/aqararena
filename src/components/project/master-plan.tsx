"use client";

import { useState, type ReactNode } from "react";
import type { ZoneKind } from "@/lib/property";

export type PlanZone = { id: string; kind: ZoneKind; label: string; shape: { x: number; y: number; w: number; h: number } };

type Props = {
  zones: PlanZone[];
  /** Details for each zone, rendered on the server. */
  panels: Record<string, ReactNode>;
  labels: { zoomIn: string; zoomOut: string; note: string; plan: string };
  /** The uploaded master-plan image, drawn under the zones. */
  image?: string;
};

/**
 * Clickable master plan. Each zone is a button placed over the plan; picking one shows its
 * details beside the plan. With a real plan image the zones sit on top of the tiled image.
 */
export function MasterPlan({ zones, panels, labels, image }: Props) {
  const [active, setActive] = useState(zones[0]?.id);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="flex flex-wrap items-stretch gap-5">
      <div className="relative min-w-0 flex-[3_1_560px] overflow-hidden rounded-3xl border border-line bg-plan">
        <div
          role="group"
          aria-label={labels.plan}
          className="relative h-[clamp(360px,48vw,520px)] origin-center transition-transform duration-300"
          style={{ transform: `scale(${zoom})` }}
        >
          {image && (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded plan, up to 4000 px
            <img src={image} alt={labels.plan} loading="lazy" decoding="async" className="absolute inset-0 size-full object-contain" />
          )}
          {zones.map((z) => {
            const selected = z.id === active;
            const idle =
              z.kind === "GREEN" ? "border-brand-3/40 bg-plan-green text-ink" : "border-photo-deep bg-surface text-ink hover:border-ink";
            return (
              <button
                key={z.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActive(z.id)}
                style={{ insetInlineStart: `${z.shape.x}%`, top: `${z.shape.y}%`, width: `${z.shape.w}%`, height: `${z.shape.h}%` }}
                className={`absolute flex items-center justify-center rounded-2xl p-2 text-center text-sm font-medium transition-colors ${
                  selected ? "border-2 border-brass-light bg-brand text-white" : `border ${idle}`
                }`}
              >
                {z.label}
              </button>
            );
          })}
        </div>
        <div className="absolute top-3.5 end-3.5 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label={labels.zoomIn}
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
            className="size-11 rounded-xl border border-line-strong bg-surface text-xl"
          >
            +
          </button>
          <button
            type="button"
            aria-label={labels.zoomOut}
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
            className="size-11 rounded-xl border border-line-strong bg-surface text-xl"
          >
            −
          </button>
        </div>
        {!image && <span className="absolute bottom-3.5 start-3.5 rounded-lg bg-surface px-2.5 py-1 text-xs text-body">{labels.note}</span>}
      </div>

      {zones.length > 0 && (
        <div aria-live="polite" className="flex min-w-0 flex-[2_1_340px] flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
          {active && panels[active]}
        </div>
      )}
    </div>
  );
}
