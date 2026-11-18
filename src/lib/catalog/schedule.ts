import { INSTALLMENTS_PER_YEAR, type InstallmentFrequency } from "@/lib/property";
import { formatPct, sortSteps, type PlanStepInput } from "./plan-steps";

// A payment plan laid out installment by installment, for price offers (spec section 7): the month,
// the amount and its share of the price, the running share, the maintenance due that month and the
// total. Amounts are whole pounds (or dollars); each is rounded and the last of its kind takes the
// rounding, so the totals are exact. Months count from the offer's issue date. Pure, so it is tested.

export type SchedulePlan = {
  downPaymentPct: number;
  deliveryPaymentPct: number;
  years: number;
  frequency: InstallmentFrequency;
  cashDiscountPct?: number | null;
  maintenancePct?: number | null;
  steps: PlanStepInput[];
};

export type ScheduleRow = {
  monthOffset: number;
  /** 0 for the payment at contract, 1, 2, … for the installments after it; null for maintenance only. */
  installment: number | null;
  amount: number;
  /** This row's share of the price, and the running share, in percent (100 from the last payment on). */
  pct: number;
  cumulativePct: number;
  maintenance: number;
  total: number;
};

export type Schedule = {
  price: number;
  maintenance: number;
  total: number;
  rows: ScheduleRow[];
  /** Cheques: one per payment step and one per maintenance step. */
  payments: number;
  maintenancePayments: number;
};

/** Splits a whole amount by shares that add up to 100: each rounded, the last takes what is left. */
export function splitAmount(total: number, pcts: number[]): number[] {
  let given = 0;
  return pcts.map((p, i) => {
    if (i === pcts.length - 1) return total - given;
    const a = Math.round((total * p) / 100);
    given += a;
    return a;
  });
}

/** Paid in full at contract. */
export const isCashPlan = (plan: Pick<SchedulePlan, "years">) => plan.years === 0;

/** What the buyer pays for the unit: the cash discount on a cash plan, then the offer's discount, in whole pounds. */
export function payablePrice(listPrice: number, plan: Pick<SchedulePlan, "years" | "cashDiscountPct">, discountPct = 0): number {
  const cash = isCashPlan(plan) ? 1 - (plan.cashDiscountPct ?? 0) / 100 : 1;
  return Math.round(listPrice * cash * (1 - discountPct / 100));
}

/** The maintenance deposit on that price, in whole pounds. */
export const maintenanceAmount = (price: number, plan: Pick<SchedulePlan, "maintenancePct">) => Math.round((price * (plan.maintenancePct ?? 0)) / 100);

/**
 * The steps a plan is paid by: its own steps, or its terms laid out as the site has always shown them
 * (down payment at contract, equal installments every 12/perYear months, delivery payment at handover).
 * A cash plan is one payment at contract.
 */
export function planSteps(plan: SchedulePlan, handoverMonth: number): PlanStepInput[] {
  if (plan.steps.length) return sortSteps(plan.steps);
  if (isCashPlan(plan)) return [{ monthOffset: 0, pct: 100, kind: "PAYMENT" }];
  const perYear = INSTALLMENTS_PER_YEAR[plan.frequency];
  const every = 12 / perYear;
  const count = plan.years * perYear;
  const rest = 100 - plan.downPaymentPct - plan.deliveryPaymentPct;
  const steps: PlanStepInput[] = [];
  if (plan.downPaymentPct > 0) steps.push({ monthOffset: 0, pct: plan.downPaymentPct, kind: "PAYMENT" });
  if (rest > 0) for (let k = 1; k <= count; k++) steps.push({ monthOffset: k * every, pct: rest / count, kind: "PAYMENT" });
  if (plan.deliveryPaymentPct > 0) steps.push({ monthOffset: Math.max(0, handoverMonth), pct: plan.deliveryPaymentPct, kind: "PAYMENT" });
  return steps;
}

type MonthTotals = { amount: number; pct: number; maintenance: number; payments: number };

/**
 * The schedule for `price` (already discounted) with `maintenance` as the deposit. Maintenance follows
 * the maintenance steps, or is one payment at handover when there are none. Steps on the same month
 * share a row.
 */
export function buildSchedule(price: number, steps: PlanStepInput[], maintenance: number, handoverMonth: number): Schedule {
  const pay = sortSteps(steps.filter((s) => s.kind === "PAYMENT"));
  let care = sortSteps(steps.filter((s) => s.kind === "MAINTENANCE"));
  if (maintenance <= 0) care = [];
  else if (care.length === 0) care = [{ monthOffset: Math.max(0, handoverMonth), pct: 100, kind: "MAINTENANCE" }];
  const payAmounts = splitAmount(price, pay.map((s) => s.pct));
  const careAmounts = splitAmount(maintenance, care.map((s) => s.pct));
  const byMonth = new Map<number, MonthTotals>();
  const at = (m: number) => {
    let r = byMonth.get(m);
    if (!r) byMonth.set(m, (r = { amount: 0, pct: 0, maintenance: 0, payments: 0 }));
    return r;
  };
  pay.forEach((s, i) => {
    const r = at(s.monthOffset);
    r.amount += payAmounts[i];
    r.pct += s.pct;
    r.payments++;
  });
  care.forEach((s, i) => (at(s.monthOffset).maintenance += careAmounts[i]));
  const lastPayment = pay.length ? pay[pay.length - 1].monthOffset : 0;
  let cumulative = 0;
  let installment = 0;
  const rows = [...byMonth.keys()]
    .sort((a, b) => a - b)
    .map((m): ScheduleRow => {
      const r = byMonth.get(m)!;
      cumulative += r.pct;
      return {
        monthOffset: m,
        installment: r.payments ? (m === 0 ? 0 : ++installment) : null,
        amount: r.amount,
        pct: r.pct,
        cumulativePct: m >= lastPayment ? 100 : cumulative,
        maintenance: r.maintenance,
        total: r.amount + r.maintenance,
      };
    });
  return { price, maintenance, total: price + maintenance, rows, payments: pay.length, maintenancePayments: care.length };
}

/** "2026-11-12" plus `months`, on the calendar: the 31st becomes the month's last day. */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = total % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/** A moment's date on Cairo's calendar, "YYYY-MM-DD" (servers run on UTC). */
export const cairoDate = (at: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(at);

/** Whole calendar months from one date to a later one; 0 when it is not later. */
export function monthsBetween(fromIso: string, toIso: string): number {
  const [fy, fm] = fromIso.split("-").map(Number);
  const [ty, tm] = toIso.split("-").map(Number);
  return Math.max(0, (ty - fy) * 12 + (tm - fm));
}

/** Everything about a plan that changes an offer's figures. An offer whose plan no longer matches any current plan shows «السعر اتغيّر». */
export function planFingerprint(plan: SchedulePlan & { typologyId: string | null }): string {
  return JSON.stringify([
    plan.typologyId,
    plan.downPaymentPct,
    plan.deliveryPaymentPct,
    plan.years,
    plan.frequency,
    plan.cashDiscountPct ?? 0,
    plan.maintenancePct ?? 0,
    sortSteps(plan.steps).map((s) => [s.kind, s.monthOffset, formatPct(s.pct)]),
  ]);
}

/** Rows split into pages: `first` on the first schedule page (it has the plan's header), `rest` on each page after. */
export function pageRows<T>(rows: T[], first: number, rest: number): T[][] {
  const pages = [rows.slice(0, first)];
  for (let i = first; i < rows.length; i += rest) pages.push(rows.slice(i, i + rest));
  return pages;
}
