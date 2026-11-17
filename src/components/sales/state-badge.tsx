import type { SalesState } from "@/lib/sales/holds";
import { STATE_LABELS } from "@/lib/sales/labels";

const STYLE: Record<SalesState, string> = {
  AVAILABLE: "bg-brand text-white",
  HELD: "bg-brass-soft text-brass-dark ring-1 ring-brass/40",
  RESERVED: "bg-divider text-body",
  // A ring, not a border, so every badge is the same height.
  SOLD: "text-muted ring-1 ring-inset ring-line-strong",
};

/** A unit's state as salespeople see it: متاحة, محجوزة مؤقتًا, محجوزة or مباعة. */
export function StateBadge({ state, className = "" }: { state: SalesState; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STYLE[state]} ${className}`}>
      {STATE_LABELS[state]}
    </span>
  );
}
