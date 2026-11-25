import { OFFER_STATE_LABELS, type OfferState } from "@/lib/sales/offers";

// The unit badges' shapes (state-badge.tsx): a filled pill for what can be sent, brass for what needs a
// look, a ring for what is over. A ring, not a border, so every badge is the same height.
const STYLE: Record<OfferState, string> = {
  VALID: "bg-brand text-white",
  PENDING: "bg-brass-soft text-brass-dark ring-1 ring-brass/40",
  PRICE_CHANGED: "bg-brass-soft text-brass-dark",
  EXPIRED: "bg-divider text-body",
  UNIT_TAKEN: "bg-divider text-body",
  CANCELLED: "text-muted ring-1 ring-inset ring-line-strong",
};

/** An offer's state now: ساري, مستني موافقة, السعر اتغيّر, انتهت صلاحيته, الوحدة اتباعت أو اتحجزت or اتلغى. */
export function OfferStateBadge({ state, className = "" }: { state: OfferState; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STYLE[state]} ${className}`}>
      {OFFER_STATE_LABELS[state]}
    </span>
  );
}
