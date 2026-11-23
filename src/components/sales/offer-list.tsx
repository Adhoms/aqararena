import Link from "next/link";
import { formatDateAr } from "@/lib/format";
import type { OfferRow } from "@/lib/sales/offer-service";
import { Money } from "./money";
import { ApproveOfferButton, CancelOfferButton } from "./offer-buttons";
import { OfferStateBadge } from "./offer-state-badge";

/**
 * Offers as rows: the unit and project, the client, the price and the state now. `decide` adds a team
 * lead's approve and reject; `showOwner` names the salesperson. A row never shows the client's link: it
 * opens the offer's page, which shows it only once the offer went out.
 */
export function OfferList({ offers, decide = false, showOwner = false }: { offers: OfferRow[]; decide?: boolean; showOwner?: boolean }) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {offers.map((o) => {
        const discount = Number(o.discountPct);
        return (
          <li key={o.id} className="flex flex-col gap-3 border-b border-divider py-3.5 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <Link href={`/sales/offers/${o.id}`} className="inline-flex min-h-11 flex-wrap items-center gap-x-1 font-medium text-ink no-underline hover:underline sm:min-h-0">
                <bdi dir="ltr" className="font-semibold">
                  {o.snap?.unit.label ?? "—"}
                </bdi>
                {o.snap && <> · {o.snap.project.nameAr}</>}
              </Link>
              <span className="text-sm break-words text-muted">
                {showOwner && <>{o.salesAccount.nameAr} · </>}
                <bdi>{o.clientName}</bdi> · {formatDateAr(o.createdAt)}
              </span>
              {o.snap && (
                <span className="text-sm text-body tabular-nums">
                  <Money value={o.snap.price} currency={o.snap.currency} />
                  {discount > 0 && (
                    <span className="text-muted">
                      {" "}
                      · خصم <bdi dir="ltr">{Number(discount.toFixed(2))}%</bdi>
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              <OfferStateBadge state={o.state} />
              {decide && (
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                  <ApproveOfferButton offerId={o.id} />
                  <CancelOfferButton offerId={o.id} mode="reject" />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
