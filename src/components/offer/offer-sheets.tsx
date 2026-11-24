import type { ReactNode } from "react";
import { MarkedPlan } from "@/components/sales/marked-plan";
import { currencyAr, fill } from "@/lib/format";
import { addMonths, monthsBetween, pageRows, type ScheduleRow } from "@/lib/catalog/schedule";
import { INSTALLMENTS_PER_YEAR } from "@/lib/property";
import { scheduleDate } from "@/lib/sales/offer-copy";
import type { OfferLanguage } from "@/lib/sales/offers";
import type { OfferCtx } from "./context";
import { Amount, Fact, Filled, Ltr, Sheet } from "./sheet";

// The offer's middle sheets (spec section 7): the master plan with the unit's zone, the unit with its
// price and floor plan, and the payment schedule over as many sheets as it needs.

/** The payment due at handover, on plans laid out from their terms. */
const DELIVERY_PAYMENT: Record<OfferLanguage, string> = { ar: "دفعة الاستلام", en: "Delivery payment" };

/** The client pays less than the unit's price: a cash discount, the offer's own discount, or both. */
export const isDiscounted = (snap: OfferCtx["snap"]) => (snap.plan.cash && (snap.plan.cashDiscountPct ?? 0) > 0) || snap.discountPct > 0;

/** The plan's name as the client reads it. */
const planName = (ctx: OfferCtx) =>
  ctx.pick(ctx.snap.plan.nameAr, ctx.snap.plan.nameEn) || (ctx.snap.plan.custom ? ctx.c.customPlan : ctx.label("frequency", ctx.snap.plan.frequency));

export function MasterPlanSheet({ ctx }: { ctx: OfferCtx }) {
  const { snap, c } = ctx;
  const p = snap.project;
  if (!p.masterPlan) return null;
  const zone = p.zone && { x: p.zone.x, y: p.zone.y, w: p.zone.w, h: p.zone.h, label: ctx.pick(p.zone.nameAr, p.zone.nameEn) };
  return (
    <Sheet label={c.masterPlan} className="flex flex-col gap-[1.8cqw] bg-plan p-[3.5cqw]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-[3cqw] gap-y-[0.6cqw]">
        <h2 className="t-lg t-display m-0">
          {c.masterPlan} · {ctx.pick(p.nameAr, p.nameEn)}
        </h2>
        <p className="t-sm m-0 flex items-center gap-[0.8cqw] text-body">
          {zone && <span aria-hidden="true" className="inline-block size-[max(12px,1.2cqw)] rounded-[3px] border-2 border-brass-light bg-brass-light/30" />}
          {zone ? fill(c.zoneMarked, { zone: zone.label }) : c.zoneUnknown}
        </p>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <MarkedPlan
          image={p.masterPlan}
          zone={zone}
          alt={`${c.masterPlan}: ${ctx.pick(p.nameAr, p.nameEn)}`}
          className="overflow-hidden rounded-[1.2cqw] md:[--plan-max-h:49cqw]"
        />
      </div>
    </Sheet>
  );
}

function PriceLine({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-[2cqw]">
      <dt className={strong ? "t-sm font-medium text-ink" : "t-sm text-muted"}>{label}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  );
}

export function UnitSheet({ ctx }: { ctx: OfferCtx }) {
  const { snap, c } = ctx;
  const u = snap.unit;
  const m2 = (v: number | null) => (v ? <Filled template={c.unit.m2} n={<Ltr>{ctx.num(v)}</Ltr>} /> : null);
  const count = (v: number | null) => (v === null ? null : <Ltr>{ctx.num(v)}</Ltr>);
  const typeName = ctx.pick(u.typeNameAr, u.typeNameEn);
  const facts: [string, ReactNode][] = [
    [c.unit.type, ctx.subType(u.subType)],
    [
      c.unit.model,
      <>
        <Ltr>{u.typeCode}</Ltr>
        {typeName && ` · ${typeName}`}
      </>,
    ],
    [c.unit.area, m2(u.buaM2)],
    [c.unit.floor, u.floor === null ? null : u.floor === 0 ? c.unit.ground : count(u.floor)],
    [c.unit.bedrooms, count(u.bedrooms)],
    [c.unit.bathrooms, count(u.bathrooms)],
    [c.unit.garden, m2(u.gardenM2)],
    [c.unit.roof, m2(u.roofM2)],
    [c.unit.terrace, m2(u.terraceM2)],
    [c.unit.view, u.view ? ctx.label("unitViews", u.view) : null],
    [c.unit.orientation, u.orientation ? ctx.label("orientations", u.orientation) : null],
    [c.unit.finishing, ctx.label("finishing", u.finishing)],
  ];
  const cash = snap.plan.cash && snap.plan.cashDiscountPct ? snap.plan.cashDiscountPct : 0;
  const discounted = isDiscounted(snap);
  return (
    <Sheet label={c.unit.title} className={`grid grid-cols-1 ${u.floorPlan ? "md:grid-cols-[1.15fr_1fr]" : ""}`}>
      <div className="flex min-h-0 flex-col gap-[2.2cqw] p-[4cqw]">
        <div className="flex flex-col gap-[0.4cqw]">
          <h2 className="t-xl t-display m-0">
            {c.unit.title} <Ltr>{u.label}</Ltr>
          </h2>
          <p className="t-sm m-0 text-muted">{ctx.pick(snap.project.nameAr, snap.project.nameEn)}</p>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-x-[2.6cqw] gap-y-[1.4cqw] sm:grid-cols-3">
          {facts
            .filter(([, v]) => v !== null && v !== undefined && v !== "")
            .map(([label, value]) => (
              <Fact key={label} label={label}>
                {value}
              </Fact>
            ))}
        </dl>
        <dl className="m-0 mt-auto flex flex-col gap-[0.9cqw] rounded-[1.4cqw] bg-ground p-[2.2cqw] tabular-nums">
          {discounted ? (
            <>
              <PriceLine label={c.listPrice}>
                <span className="t-md text-muted line-through decoration-1">
                  <Amount ctx={ctx} value={snap.listPrice} />
                </span>
              </PriceLine>
              {cash > 0 && (
                <PriceLine label={c.cashDiscount}>
                  <span className="t-md font-medium text-brass">
                    <Ltr>{`- ${ctx.pct(cash)}`}</Ltr>
                  </span>
                </PriceLine>
              )}
              {snap.discountPct > 0 && (
                <PriceLine label={c.discount}>
                  <span className="t-md font-medium text-brass">
                    <Ltr>{`- ${ctx.pct(snap.discountPct)}`}</Ltr>
                  </span>
                </PriceLine>
              )}
              <PriceLine label={c.netPrice} strong>
                <span className="t-xl font-display font-normal text-brand">
                  <Amount ctx={ctx} value={snap.price} />
                </span>
              </PriceLine>
            </>
          ) : (
            <PriceLine label={c.price} strong>
              <span className="t-xl font-display font-normal text-brand">
                <Amount ctx={ctx} value={snap.price} />
              </span>
            </PriceLine>
          )}
          <div className="t-xs flex flex-wrap justify-between gap-x-[2cqw] gap-y-[0.4cqw] text-muted">
            <span>
              {c.plan}: <span className="text-body">{planName(ctx)}</span>
            </span>
            {snap.schedule.maintenance > 0 && (
              <span>
                {c.maintenanceOnly}:{" "}
                <span className="text-body">
                  <Amount ctx={ctx} value={snap.schedule.maintenance} />
                </span>
              </span>
            )}
          </div>
        </dl>
      </div>
      {u.floorPlan && (
        <figure className="m-0 flex min-h-0 flex-col gap-[1cqw] bg-white p-[3cqw]">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded floor plan; lazy on screen, loaded before printing */}
          <img src={u.floorPlan} alt={c.unit.floorPlan} loading="lazy" className="pic-edge max-h-[70vh] min-h-0 w-full flex-1 rounded-[0.8cqw] object-contain md:max-h-none" />
          <figcaption className="t-xs text-muted">
            {c.unit.floorPlan} · <Ltr>{u.typeCode}</Ltr>
          </figcaption>
        </figure>
      )}
    </Sheet>
  );
}

/**
 * Rows per schedule sheet, measured on a 297 mm sheet: the first also has the plan's totals, and the
 * last one the totals row and the cheque count, which fit under a full sheet of rows with room to spare.
 */
export const FIRST_SHEET_ROWS = 13;
export const NEXT_SHEET_ROWS = 16;

/**
 * The schedule's rows by sheet: as few sheets as hold them, the rows shared as evenly as the first
 * sheet's smaller size allows (14 rows: 7 and 7, not 13 and 1; 34 rows: 12, 11, 11).
 */
export function scheduleSheets<T>(rows: T[]): T[][] {
  if (rows.length <= FIRST_SHEET_ROWS) return [rows];
  const sheets = 1 + Math.ceil((rows.length - FIRST_SHEET_ROWS) / NEXT_SHEET_ROWS);
  const first = Math.min(FIRST_SHEET_ROWS, Math.ceil(rows.length / sheets));
  return pageRows(rows, first, Math.ceil((rows.length - first) / (sheets - 1)));
}

export type NamedRow = { row: ScheduleRow; name: string };

/**
 * Each schedule row with its name: the down payment (or the cash payment), the installments numbered
 * in order, the payment due at handover, and maintenance on its own. The snapshot doesn't mark the
 * handover payment, so on a plan laid out from its terms it is the row in the handover month that is
 * off the installments' rhythm, or larger than an installment, or after the last one.
 */
export function namedRows(ctx: OfferCtx): NamedRow[] {
  const { snap, c } = ctx;
  const rows = snap.schedule.rows;
  const every = 12 / INSTALLMENTS_PER_YEAR[snap.plan.frequency];
  const handover = snap.plan.cash || snap.plan.custom ? -1 : monthsBetween(ctx.issuedIso, snap.project.deliveryDate);
  const regular = rows.filter((r) => r.installment && r.monthOffset !== handover && r.monthOffset % every === 0).map((r) => r.pct);
  const installmentPct = regular.length ? regular.sort((a, b) => a - b)[Math.floor(regular.length / 2)] : null;
  const isHandover = (r: ScheduleRow) =>
    r.monthOffset === handover &&
    r.monthOffset > 0 &&
    r.amount > 0 &&
    (r.monthOffset % every !== 0 || r.monthOffset > snap.plan.years * 12 || (installmentPct !== null && r.pct > installmentPct + 1e-6));
  let n = 0;
  return rows.map((row) => {
    let name: string;
    if (row.installment === null) name = c.maintenanceOnly;
    else if (row.installment === 0) name = snap.plan.cash ? c.cashPayment : c.downPayment;
    else if (isHandover(row)) name = DELIVERY_PAYMENT[ctx.language];
    else name = fill(c.installment, { n: ctx.num(++n) });
    return { row, name };
  });
}

export function ScheduleSheet({ ctx, rows, first, last, page, pages }: { ctx: OfferCtx; rows: NamedRow[]; first: boolean; last: boolean; page: number; pages: number }) {
  const { snap, c } = ctx;
  const s = snap.schedule;
  const col = c.columns;
  const currency = ctx.language === "ar" ? currencyAr(snap.currency) : snap.currency;
  const title = first ? c.schedule : c.continued;
  const n = (v: number) => <Ltr>{ctx.num(v)}</Ltr>;
  const p = (v: number) => <Ltr>{ctx.pct(v)}</Ltr>;
  return (
    <Sheet label={pages > 1 ? `${title} (${page}/${pages})` : title} className="flex flex-col gap-[1.6cqw] p-[3.5cqw]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-[3cqw] gap-y-[0.4cqw] md:flex-nowrap">
        <h2 className="t-lg t-display m-0 shrink-0">{title}</h2>
        {/* One line on a sheet, whatever the project's name: a second line would push the last row off the page. */}
        <p className="t-sm m-0 min-w-0 text-muted md:truncate">
          <Ltr>{snap.unit.label}</Ltr> · {ctx.pick(snap.project.nameAr, snap.project.nameEn)} · {planName(ctx)}
          {pages > 1 && (
            <>
              {" "}
              · <Ltr>{`${page}/${pages}`}</Ltr>
            </>
          )}
        </p>
      </div>
      {first && (
        <dl className="m-0 grid grid-cols-2 gap-[1.2cqw] rounded-[1.4cqw] bg-ground p-[1.6cqw_2.2cqw] sm:grid-cols-4">
          <Fact label={isDiscounted(snap) ? c.netPrice : c.price}>
            <Amount ctx={ctx} value={s.price} />
          </Fact>
          <Fact label={c.maintenanceOnly}>{s.maintenance > 0 ? <Amount ctx={ctx} value={s.maintenance} /> : "—"}</Fact>
          <Fact label={col.total}>
            <span className="text-brand">
              <Amount ctx={ctx} value={s.total} />
            </span>
          </Fact>
          <Fact label={c.issued}>{ctx.issued}</Fact>
        </dl>
      )}
      <div className="overflow-x-auto md:overflow-visible">
        <table className="offer-table t-xs min-w-[640px] md:min-w-0">
          <thead>
            <tr>
              <th scope="col">{col.no}</th>
              <th scope="col">{col.date}</th>
              <th scope="col">{`${col.amount} (${currency})`}</th>
              <th scope="col">{col.pct}</th>
              <th scope="col">{col.cumulative}</th>
              <th scope="col">{`${col.maintenance} (${currency})`}</th>
              <th scope="col">{`${col.total} (${currency})`}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row: r, name }) => (
              <tr key={r.monthOffset}>
                <th scope="row" className="font-medium">
                  {name}
                </th>
                <td>{scheduleDate(addMonths(ctx.issuedIso, r.monthOffset), ctx.language)}</td>
                <td>{r.amount ? n(r.amount) : "—"}</td>
                <td>{r.amount ? p(r.pct) : "—"}</td>
                <td className="text-brass">{p(r.cumulativePct)}</td>
                <td>{r.maintenance ? n(r.maintenance) : "—"}</td>
                <td className="font-medium">{n(r.total)}</td>
              </tr>
            ))}
          </tbody>
          {last && (
            <tfoot>
              <tr>
                <th scope="row">{c.totals}</th>
                <td />
                <td>{n(s.price)}</td>
                <td>{p(100)}</td>
                <td />
                <td>{s.maintenance ? n(s.maintenance) : "—"}</td>
                <td>{n(s.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {last && (
        <p className="t-xs m-0 mt-auto text-muted">
          {fill(c.cheques, { payments: ctx.num(s.payments), maintenance: ctx.num(s.maintenancePayments), all: ctx.num(s.payments + s.maintenancePayments) })}
        </p>
      )}
    </Sheet>
  );
}
