import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Panel } from "@/components/admin/fields";
import { CancelHoldButton, ConvertHoldButton } from "@/components/sales/hold-buttons";
import { HoldStatus } from "@/components/sales/hold-status";
import { SalesShell } from "@/components/sales/sales-shell";
import { formatCountAr as num, formatDateAr, formatDateTimeAr } from "@/lib/format";
import { holdOutcome, subTypeSingular, unitLabel } from "@/lib/sales/labels";
import { myHolds, RECENT_DAYS, RECENT_LIMIT, type HoldRow } from "@/lib/sales/my-holds";
import { requireSales } from "@/lib/sales/session";

export const metadata: Metadata = { title: "حجوزاتي" };


function HoldItem({ h, detail, tone, children }: { h: HoldRow; detail: ReactNode; tone?: "good"; children?: ReactNode }) {
  const t = h.unit.typology;
  return (
    <li className="flex flex-col gap-3 border-b border-divider py-3.5 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <Link href={`/sales/units/${h.unitId}`} className="inline-flex min-h-11 flex-wrap items-center gap-x-1 font-medium text-ink no-underline hover:underline sm:min-h-0">
          <bdi dir="ltr" className="font-semibold">
            {unitLabel(h.unit)}
          </bdi>{" "}
          · {h.unit.typology.project.nameAr}
        </Link>
        <span className="text-sm text-muted">
          <bdi dir="ltr">{t.code}</bdi> · {t.nameAr ?? subTypeSingular(t.subType)}
        </span>
        <span className={`text-sm ${tone === "good" ? "text-brand" : "text-body"}`}>{detail}</span>
        {h.clientNote && (
          <span className="text-sm break-words text-muted">
            الحجز لـ: <bdi>{h.clientNote}</bdi>
          </span>
        )}
      </div>
      {children && <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:flex-wrap sm:items-start">{children}</div>}
    </li>
  );
}

const List = ({ children }: { children: ReactNode }) => <ul className="m-0 flex list-none flex-col p-0">{children}</ul>;
const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted">{children}</p>;

// My live holds, how my holds of the last 30 days ended, and for a team lead the team's live holds.
// It reads the session on every request, so it renders per request (the Sales layout's Suspense holds it).
export default async function SalesHoldsPage() {
  const me = await requireSales();
  const { mine, recent, team } = await myHolds({ id: me.id, role: me.role, developerId: me.developer.id });
  const isLead = me.role === "LEAD";

  return (
    <SalesShell me={me} title="حجوزاتي">
      {/* The result of confirming or cancelling, above the lists: the row that ran it leaves the page. */}
      <HoldStatus top>
        <Panel title={`السارية (${num(mine.length)})`}>
          {mine.length === 0 ? (
            <Empty>
              مفيش حجوزات سارية دلوقتي. احجز وحدة من صفحتها في <Link href="/sales">المخزون</Link>.
            </Empty>
          ) : (
            <List>
              {mine.map((h) => (
                <HoldItem key={h.id} h={h} detail={`لحد ${formatDateTimeAr(h.expiresAt)}`}>
                  <ConvertHoldButton holdId={h.id} />
                  <CancelHoldButton holdId={h.id} />
                </HoldItem>
              ))}
            </List>
          )}
        </Panel>

        {isLead && (
          <Panel title={`حجوزات الفريق (${num(team.length)})`}>
            {team.length === 0 ? (
              <Empty>مفيش حد من الفريق حاجز وحدات دلوقتي.</Empty>
            ) : (
              <List>
                {team.map((h) => (
                  <HoldItem key={h.id} h={h} detail={`${h.salesAccount.nameAr} · لحد ${formatDateTimeAr(h.expiresAt)}`}>
                    <CancelHoldButton holdId={h.id} holder={h.salesAccount.nameAr} />
                  </HoldItem>
                ))}
              </List>
            )}
          </Panel>
        )}

        <Panel title={recent.length >= RECENT_LIMIT ? `آخر ${num(RECENT_LIMIT)} حجز` : `آخر ${num(RECENT_DAYS)} يوم`}>
          {recent.length === 0 ? (
            <Empty>مفيش حجوزات خلصت في آخر {num(RECENT_DAYS)} يوم.</Empty>
          ) : (
            <List>
              {recent.map((h) => (
                <HoldItem
                  key={h.id}
                  h={h}
                  tone={h.status === "CONVERTED" ? "good" : undefined}
                  detail={`${holdOutcome(h)}${h.releasedBy && h.releasedById !== h.salesAccountId ? ` بواسطة ${h.releasedBy.nameAr}` : ""} · اتعمل ${formatDateAr(h.createdAt)}`}
                />
              ))}
            </List>
          )}
        </Panel>
      </HoldStatus>
    </SalesShell>
  );
}
