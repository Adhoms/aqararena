import type { ReactNode } from "react";
import { MarkedPlan } from "@/components/sales/marked-plan";
import { currencyAr, fill } from "@/lib/format";
import { addMonths, pageRows, type ScheduleRow } from "@/lib/catalog/schedule";
import { scheduleDate } from "@/lib/sales/offer-copy";
import type { OfferCtx } from "./context";
import { Amount, Fact, Filled, Ltr, Sheet } from "./sheet";

// The offer's middle sheets (spec section 7): the master plan with the unit's zone, the unit with its
// price and floor plan, and the payment schedule over as many sheets as it needs.

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
          loading="eager"
          className="relative mx-auto w-fit max-w-full overflow-hidden rounded-[1.2cqw]"
          imgClassName="block h-auto max-h-[70vh] w-auto max-w-full md:max-h-[49cqw]"
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
  const discounted = cash > 0 || snap.discountPct > 0;
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
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded floor plan; eager so it prints */}
          <img src={u.floorPlan} alt={c.unit.floorPlan} loading="eager" className="pic-edge max-h-[70vh] min-h-0 w-full flex-1 rounded-[0.8cqw] object-contain md:max-h-none" />
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
 * last one the totals row and the cheque count, which still fit under a full sheet of rows.
 */
export const FIRST_SHEET_ROWS = 13;
export const NEXT_SHEET_ROWS = 17;

/**
 * The schedule's rows by sheet: up to FIRST_SHEET_ROWS on the first, the rest shared evenly over as
 * few sheets as hold them (34 rows: 13, 11, 10 rather than 13, 17, 4).
 */
export function scheduleSheets(rows: ScheduleRow[]): ScheduleRow[][] {
  const rest = rows.length - FIRST_SHEET_ROWS;
  if (rest <= 0) return [rows];
  const size = Math.ceil(rest / Math.ceil(rest / NEXT_SHEET_ROWS));
  return pageRows(rows, FIRST_SHEET_ROWS, size);
}

export function ScheduleSheet({ ctx, rows, first, last, page, pages }: { ctx: OfferCtx; rows: ScheduleRow[]; first: boolean; last: boolean; page: number; pages: number }) {
  const { snap, c } = ctx;
  const s = snap.schedule;
  const col = c.columns;
  const currency = ctx.language === "ar" ? currencyAr(snap.currency) : snap.currency;
  const name = (r: ScheduleRow) =>
    r.installment === null ? c.maintenanceOnly : r.installment === 0 ? (snap.plan.cash ? c.cashPayment : c.downPayment) : fill(c.installment, { n: ctx.num(r.installment) });
  const title = first ? c.schedule : c.continued;
  const n = (v: number) => <Ltr>{ctx.num(v)}</Ltr>;
  const p = (v: number) => <Ltr>{ctx.pct(v)}</Ltr>;
  return (
    <Sheet label={pages > 1 ? `${title} (${page}/${pages})` : title} className="flex flex-col gap-[1.6cqw] p-[3.5cqw]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-[3cqw] gap-y-[0.4cqw]">
        <h2 className="t-lg t-display m-0">{title}</h2>
        <p className="t-sm m-0 text-muted">
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
          <Fact label={snap.discountPct > 0 || snap.plan.cash ? c.netPrice : c.price}>
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
            {rows.map((r) => (
              <tr key={r.monthOffset}>
                <th scope="row" className="font-medium">
                  {name(r)}
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
                <td>{c.totals}</td>
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
