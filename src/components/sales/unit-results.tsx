import Link from "next/link";
import { formatDateTimeAr } from "@/lib/format";
import { BASIS_LABELS, type BudgetBasis } from "@/lib/sales/budget";
import type { SalesUnitRow } from "@/lib/sales/inventory";
import { floorLabel, subTypeSingular, viewLabel } from "@/lib/sales/labels";
import { Money } from "./money";
import { StateBadge } from "./state-badge";

// Unit | project and type | bedrooms | floor | view | price | state.
// On a phone the figure's name sits quietly before it; from tablet up the column head says it.
const label = "font-sans text-xs font-normal text-muted md:sr-only";
const COLS = "md:grid-cols-[minmax(4.5rem,1fr)_minmax(0,1.7fr)_minmax(2.5rem,0.5fr)_minmax(3rem,0.6fr)_minmax(0,1fr)_minmax(7rem,1.4fr)_9rem]";

function HoldNote({ hold }: { hold: NonNullable<SalesUnitRow["hold"]> }) {
  return (
    <>
      {hold.mine ? "محجوزة ليك" : `محجوزة لـ ${hold.name}`} لحد {formatDateTimeAr(hold.expiresAt)}
    </>
  );
}

/** Search results: a card per unit on a phone, a dense row from tablet width up. The whole row opens the unit. */
export function UnitResults({ rows, basis, showProject }: { rows: SalesUnitRow[]; basis: BudgetBasis | null; showProject: boolean }) {
  const figureHead = basis && basis !== "total" ? BASIS_LABELS[basis] : null;
  return (
    <ul className="m-0 flex list-none flex-col p-0 text-sm">
      <li aria-hidden="true" className={`hidden gap-3 border-b border-line px-3 pb-2.5 text-xs font-semibold text-muted md:grid lg:gap-4 ${COLS}`}>
        <span>الوحدة</span>
        <span>{showProject ? "المشروع والنموذج" : "النموذج"}</span>
        <span>الغرف</span>
        <span>الدور</span>
        <span>الإطلالة</span>
        <span>{figureHead ?? "السعر"}</span>
        <span className="text-end">الحالة</span>
      </li>
      {rows.map((r) => (
        <li key={r.id} className="border-b border-divider last:border-0">
          <Link
            href={`/sales/units/${r.id}`}
            className={`-mx-3 flex flex-col gap-1.5 rounded-xl px-3 py-3.5 no-underline transition-colors hover:bg-ground md:mx-0 md:grid md:items-center md:gap-3 lg:gap-4 ${COLS} ${r.state === "SOLD" ? "text-muted" : "text-ink"}`}
          >
            {/* Phone: the unit and its state share the top line. Tablet up: two columns, the state last. */}
            <span className="flex items-start justify-between gap-3 md:contents">
              <bdi dir="ltr" className="min-w-0 font-semibold break-words">
                {r.label}
              </bdi>
              <span className="flex flex-col items-end gap-1 md:order-last">
                <StateBadge state={r.state} />
                {r.hold && (
                  <span className="hidden text-end text-xs leading-snug text-brass-dark md:block">
                    <HoldNote hold={r.hold} />
                  </span>
                )}
              </span>
            </span>
            <span className="flex min-w-0 flex-col">
              {showProject && <span className="text-body">{r.projectName}</span>}
              <span className={showProject ? "text-muted" : "text-body"}>
                <bdi dir="ltr">{r.typeCode}</bdi> · {r.typeName ?? subTypeSingular(r.subType)}
              </span>
            </span>
            <span className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted md:contents">
              <span className={r.bedrooms === null ? "max-md:hidden" : ""}>
                <span className="md:sr-only">غرف النوم </span>
                {r.bedrooms === null ? "—" : <bdi dir="ltr">{r.bedrooms}</bdi>}
              </span>
              <span className={r.floor === null ? "max-md:hidden" : ""}>
                <span className="md:sr-only">الدور </span>
                <bdi dir="ltr">{floorLabel(r.floor)}</bdi>
              </span>
              <span className={r.view === null ? "max-md:hidden" : ""}>
                <span className="md:sr-only">الإطلالة </span>
                {viewLabel(r.view)}
              </span>
            </span>
            <span className="font-display text-[15px] font-medium">
              {r.figure !== null ? (
                <>
                  <span className={label}>{figureHead} </span>
                  <Money value={r.figure} currency={r.currency} />
                  <span className="block font-sans text-xs font-normal text-muted">
                    السعر <Money value={r.price} currency={r.currency} />
                  </span>
                </>
              ) : (
                <>
                  <span className={label}>السعر </span>
                  <Money value={r.price} currency={r.currency} />
                </>
              )}
            </span>
            {r.hold && (
              <span className="text-xs leading-snug text-brass-dark md:hidden">
                <HoldNote hold={r.hold} />
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
