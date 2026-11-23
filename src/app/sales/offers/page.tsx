import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/admin/fields";
import { HoldStatus } from "@/components/sales/hold-status";
import { OfferList } from "@/components/sales/offer-list";
import { SalesShell } from "@/components/sales/sales-shell";
import { formatCountAr as num } from "@/lib/format";
import { myOffers, pendingApprovals } from "@/lib/sales/offer-service";
import { requireSales } from "@/lib/sales/session";

export const metadata: Metadata = { title: "عروضي" };

// My offers with their state now; a team lead also gets the team's offers waiting for approval
// (the full team page comes in phase 4).
export default async function SalesOffersPage() {
  const me = await requireSales();
  const actor = { id: me.id, role: me.role, developerId: me.developer.id };
  const [mine, pending] = await Promise.all([myOffers(actor), pendingApprovals(actor)]);
  return (
    <SalesShell me={me} title="عروضي">
      {/* The result of approving or rejecting, above the lists: the row that ran it leaves the page. */}
      <HoldStatus top>
        {me.role === "LEAD" && (
          <Panel title={`مستنية موافقتك (${num(pending.length)})`}>
            {pending.length ? <OfferList offers={pending} decide showOwner /> : <p className="m-0 text-sm text-muted">مفيش عروض مستنية موافقة.</p>}
          </Panel>
        )}
        <Panel title={`عروضي (${num(mine.length)})`}>
          {mine.length ? (
            <OfferList offers={mine} />
          ) : (
            <p className="m-0 text-sm text-muted">
              لسه ماعملتش عروض. افتح وحدة من <Link href="/sales">المخزون</Link> واضغط «عرض سعر».
            </p>
          )}
        </Panel>
      </HoldStatus>
    </SalesShell>
  );
}
